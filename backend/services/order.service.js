const { pool } = require('../config/database');
const logger = require('../utils/logger');
const emailService = require('../services/email.service');
const emailTemplates = require('../utils/email.templates');
const { getReservationDurationMinutes } = require('../utils/settings.service');

const STATUS_TRANSITIONS = {
    'pending': ['preparing', 'cancelled'],
    'preparing': ['ready', 'cancelled'],
    'ready': ['completed', 'cancelled'],
    'completed': [],
    'cancelled': []
};

class OrderService {

    // ==============================================================================
    // CORE CRUD
    // ==============================================================================

    async createOrder(orderData) {
        const {
            table_id,
            items,
            customer_notes,
            order_type = 'dine-in',
            restaurant_id,
            reservation_id,
            scheduled_for,
            payment_status,
            payment_method,
            payment_intent_id,
            payment_amount,
            user_id,
            tip_amount = 0
        } = orderData;

        // 1. Validation Logic
        this._validateOrderType(order_type);
        this._validatePayment(payment_status, payment_intent_id, payment_amount);
        await this._validateIdempotency(payment_intent_id);

        if (order_type === 'dine-in' || order_type === 'walk-in') {
            if (!table_id) throw new Error('Table ID is required for dine-in and walk-in orders');
            await this._checkTableReservationGuard(table_id);
        }

        if (order_type === 'pre-order') {
            await this._validatePreOrder(reservation_id);
        }

        this._validateItems(items);

        // 2. Transactional Creation
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const totalAmount = await this._calculateTotalAndVerifyItems(client, items);

            // Insert Order
            const orderResult = await client.query(
                `INSERT INTO orders (
                    table_id, restaurant_id, user_id, total_amount, customer_notes,
                    status, order_type, reservation_id, scheduled_for,
                    payment_status, payment_method, payment_intent_id, payment_amount, tip_amount,
                    created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
                RETURNING *`,
                [
                    table_id, restaurant_id, user_id, 0, customer_notes || '',
                    'pending', order_type, reservation_id, scheduled_for,
                    payment_status, payment_method, payment_intent_id, payment_amount, tip_amount
                ]
            );
            const order = orderResult.rows[0];

            // Insert Items
            const orderItems = await this._insertOrderItems(client, order.id, items);

            // Update Total
            await client.query('UPDATE orders SET total_amount = $1 WHERE id = $2', [totalAmount, order.id]);
            order.total_amount = totalAmount;

            // Handle Pre-order Reservation Link
            if (order_type === 'pre-order' && reservation_id) {
                await client.query('UPDATE reservations SET has_pre_order = true WHERE id = $1', [reservation_id]);
                // Confirm logic handled separately if needed, but often done here? 
                // Original controller did it AFTER creation. We can do it here inside transaction for atomicity.
                if (payment_status === 'completed') {
                    await client.query(
                        `UPDATE reservations SET status = 'confirmed', confirmed_at = NOW(), payment_id = $1, has_pre_order = true, updated_at = NOW() 
                        WHERE id = $2 AND status = 'tentative'`,
                        [payment_intent_id, reservation_id]
                    );
                }
            }

            await client.query('COMMIT');

            // Post-creation side effects (Email/Notifications) can be triggered by controller or here.
            // Returning the full object for DTO.
            return { ...order, items: orderItems };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getAllOrders(page = 1, limit = 10, restaurantId = null) {
        const offset = (page - 1) * limit;
        const params = [];
        let whereClause = '';

        if (restaurantId) {
            whereClause = 'WHERE restaurant_id = $1';
            params.push(restaurantId);
        }

        // Count Query
        const countRes = await pool.query(
            `SELECT COUNT(*) FROM orders ${whereClause}`,
            params
        );
        const total = parseInt(countRes.rows[0].count);

        // Data Query
        const query = `
            SELECT * FROM orders 
            ${whereClause} 
            ORDER BY created_at DESC 
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        // Add limit/offset to params
        const finalParams = [...params, limit, offset];

        const result = await pool.query(query, finalParams);
        const orders = await Promise.all(result.rows.map(o => this._attachItems(o)));

        return { orders, total };
    }

    async getOrderById(id) {
        const result = await pool.query(
            `SELECT o.*, t.table_number, r.name as restaurant_name 
             FROM orders o
             LEFT JOIN tables t ON o.table_id = t.id
             LEFT JOIN restaurants r ON o.restaurant_id = r.id
             WHERE o.id = $1`,
            [id]
        );
        if (result.rows.length === 0) return null;
        return this._attachItems(result.rows[0]);
    }

    async getActiveOrders() {
        const result = await pool.query(
            "SELECT * FROM orders WHERE status IN ('pending', 'preparing', 'ready') ORDER BY created_at ASC"
        );
        return Promise.all(result.rows.map(o => this._attachItems(o)));
    }

    async getOrdersByTable(tableId) {
        const result = await pool.query(
            'SELECT * FROM orders WHERE table_id = $1 ORDER BY created_at DESC',
            [tableId]
        );
        return Promise.all(result.rows.map(o => this._attachItems(o)));
    }

    async getOrdersByUser(userId) {
        const result = await pool.query(
            `SELECT o.*, r.name AS restaurant_name, r.image_url AS restaurant_image, r.timezone AS restaurant_timezone
             FROM orders o
             LEFT JOIN restaurants r ON o.restaurant_id = r.id
             WHERE o.user_id = $1
             ORDER BY o.created_at DESC`,
            [userId]
        );
        return Promise.all(result.rows.map(o => this._attachItems(o)));
    }

    async getOrderByPaymentIntent(paymentIntentId) {
        const result = await pool.query('SELECT * FROM orders WHERE payment_intent_id = $1 LIMIT 1', [paymentIntentId]);
        if (result.rows.length === 0) return null;
        return this._attachItems(result.rows[0]);
    }

    async updateOrderStatus(id, status) {
        // Validate and perform transition; return { order, changed }
        const currentOrder = await this.getOrderById(id);
        if (!currentOrder) throw new Error('Order not found');

        // Idempotent: if status is already the target, return no-op
        if (String(currentOrder.status) === String(status)) {
            return { order: currentOrder, changed: false };
        }

        const allowed = STATUS_TRANSITIONS[currentOrder.status] || [];
        if (!allowed.includes(status)) {
            throw new Error(`Cannot transition from '${currentOrder.status}' to '${status}'. Allowed: ${allowed.join(', ')}`);
        }

        const result = await pool.query(
            'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, id]
        );
        const attached = await this._attachItems(result.rows[0]);
        return { order: attached, changed: true };
    }

    // ==============================================================================
    // HELPERS
    // ==============================================================================

    async _attachItems(order) {
        const itemsRes = await pool.query(
            `SELECT oi.*, m.name, m.price 
             FROM order_items oi 
             LEFT JOIN menu_items m ON oi.menu_item_id = m.id 
             WHERE oi.order_id = $1 ORDER BY oi.id`,
            [order.id]
        );
        return { ...order, items: itemsRes.rows };
    }

    _validateOrderType(type) {
        const valid = ['dine-in', 'pre-order', 'walk-in', 'takeout'];
        if (!valid.includes(type)) throw new Error(`Invalid order_type. Must be: ${valid.join(', ')}`);
    }

    _validatePayment(status, id, amount) {
        if (status !== 'completed') throw new Error('Payment must be completed before creating order');
        if (!id || !amount) throw new Error('Payment intent ID and amount are required');
    }

    async _validateIdempotency(paymentIntentId) {
        if (!paymentIntentId) return;
        const res = await pool.query('SELECT id FROM orders WHERE payment_intent_id = $1 LIMIT 1', [paymentIntentId]);
        if (res.rows.length > 0) throw new Error('Order already exists for this payment');
    }

    async _checkTableReservationGuard(tableId) {
        // Find restaurant for table
        const tRes = await pool.query('SELECT restaurant_id FROM tables WHERE id = $1', [tableId]);
        const restaurantId = tRes.rows[0]?.restaurant_id;
        if (!restaurantId) return;

        const buffer = await getReservationDurationMinutes(restaurantId);

        const existing = await pool.query(`
            SELECT id FROM reservations 
            WHERE table_id = $1 
              AND status IN ('pending','confirmed')
              AND (reservation_date::timestamp + reservation_time) BETWEEN NOW() AND (NOW() + ($2 || ' minutes')::interval)
            LIMIT 1
        `, [tableId, buffer]);

        if (existing.rows.length > 0) {
            const error = new Error(`Upcoming reservation detected for this table within ${buffer} minutes`);
            error.statusCode = 409;
            throw error;
        }
    }

    async _validatePreOrder(reservationId) {
        if (!reservationId) throw new Error('Reservation ID required for pre-orders');
        const res = await pool.query('SELECT status FROM reservations WHERE id = $1', [reservationId]);
        if (res.rows.length === 0) {
            const err = new Error('Reservation not found');
            err.statusCode = 404;
            throw err;
        }
        if (res.rows[0].status === 'cancelled') throw new Error('Cannot create pre-order for cancelled reservation');
    }

    _validateItems(items) {
        if (!items || !Array.isArray(items) || items.length === 0) throw new Error('Items required');
        items.forEach(item => {
            if (!item.menu_item_id) throw new Error('Each item must have menu_item_id');
            if (!item.quantity || item.quantity < 1) throw new Error('Quantity must be >= 1');
        });
    }

    async _calculateTotalAndVerifyItems(client, items) {
        let total = 0;
        for (const item of items) {
            const res = await client.query('SELECT name, price, available FROM menu_items WHERE id = $1', [item.menu_item_id]);
            if (res.rows.length === 0) throw new Error(`Menu item ${item.menu_item_id} not found`);
            if (!res.rows[0].available) throw new Error(`Menu item "${res.rows[0].name}" is not available`);

            total += parseFloat(res.rows[0].price) * item.quantity;
        }
        return total;
    }

    async _insertOrderItems(client, orderId, items) {
        const orderItems = [];
        for (const item of items) {
            const mRes = await client.query('SELECT name, price FROM menu_items WHERE id = $1', [item.menu_item_id]);
            const m = mRes.rows[0];
            const subtotal = parseFloat(m.price) * item.quantity;

            const iRes = await client.query(
                `INSERT INTO order_items (order_id, menu_item_id, menu_item_name, menu_item_price, quantity, special_instructions, subtotal, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
                [orderId, item.menu_item_id, m.name, m.price, item.quantity, item.special_instructions || '', subtotal]
            );
            orderItems.push(iRes.rows[0]);
        }
        return orderItems;
    }

    async sendReceiptEmail(order, items, userEmail) {
        if (!userEmail) {
            if (order.user_id) {
                const uRes = await pool.query('SELECT email FROM users WHERE id = $1', [order.user_id]);
                if (uRes.rows.length > 0) userEmail = uRes.rows[0].email;
            }
        }
        if (!userEmail) return;

        try {
            // Re-calculate tip logic for template
            // Ensure numeric
            const tip = parseFloat(order.tip_amount || 0);
            const subtotal = parseFloat(order.payment_amount); // assuming payment_amount is subtotal? 
            // BE CAREFUL: In controller it was total: parseFloat(payment_amount) + parseFloat(tip_amount || 0)
            // payment_amount usually includes everything in Stripe? Or does it?
            // Assuming payment_amount is the CHARGED amount.

            const receipt = emailTemplates.paymentReceipt({
                order,
                items,
                tip_amount: tip,
                total: parseFloat(order.payment_amount) + tip // logic from controller, but verify if payment_amount ALREADY checks out
            });

            await emailService.sendEmail({
                to: userEmail,
                subject: receipt.subject,
                html: receipt.html,
                text: receipt.text
            });
        } catch (e) {
            logger.error('Failed to send receipt email', { error: e.message, orderId: order.id });
        }
    }
}

module.exports = new OrderService();

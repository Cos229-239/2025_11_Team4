const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { pool } = require('../config/database');
const logger = require('../utils/logger');
const jwtLib = require('jsonwebtoken');
const orderService = require('../services/order.service');
const OrderDTO = require('../dtos/order.dto');


/**
 * Calculate total amount based on database prices
 * @param {Array} items - List of items with { id, quantity }
 * @returns {Promise<number>} - Total amount in cents
 */
const calculateOrderAmount = async (items) => {
    if (!items || items.length === 0) return 0;

    let total = 0;
    const client = await pool.connect();

    try {
        for (const item of items) {
            const result = await client.query('SELECT price FROM menu_items WHERE id = $1', [item.id]);
            if (result.rows.length > 0) {
                // Price is in dollars/decimal in DB, convert to cents for Stripe
                const price = parseFloat(result.rows[0].price);
                total += price * item.quantity;
            }
        }
    } finally {
        client.release();
    }

    // Round to nearest cent to avoid floating point errors
    return Math.round(total * 100);
};

exports.createPaymentIntent = async (req, res) => {
    const client = await pool.connect();
    try {
        const { items, currency = 'usd', metadata, reservationId, tipAmount = 0 } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'No items provided' });
        }

        let amount = await calculateOrderAmount(items);

        const tip = Math.max(0, Number(tipAmount) || 0);
        // Add tip if provided
        if (tip > 0) {
            amount += Math.round(tip * 100);
        }

        if (amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid order amount' });
        }

        // Reservation Logic: Check and Extend Hold
        if (reservationId) {
            await client.query('BEGIN');
            const r = await client.query('SELECT * FROM reservations WHERE id = $1 FOR UPDATE', [reservationId]);
            if (r.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, message: 'Reservation not found' });
            }
            const reservation = r.rows[0];

            if (reservation.status !== 'tentative') {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: `Reservation not tentative (status=${reservation.status})` });
            }

            const now = new Date();
            const expiresAt = reservation.expires_at ? new Date(reservation.expires_at) : null;
            if (expiresAt && expiresAt < now) {
                await client.query("UPDATE reservations SET status = 'expired', updated_at = NOW() WHERE id = $1", [reservationId]);
                await client.query('COMMIT');
                return res.status(410).json({ success: false, message: 'Reservation expired. Please start over.' });
            }

            // Extend by 5 minutes to allow payment to complete
            const newExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
            await client.query(
                `UPDATE reservations SET expires_at = $1, updated_at = NOW() WHERE id = $2`,
                [newExpiresAt, reservationId]
            );
            await client.query('COMMIT');
        }

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: { ...(metadata || {}), tipAmount: tip },
        });

        res.send({
            success: true,
            clientSecret: paymentIntent.client_secret,
            id: paymentIntent.id, // Return ID for confirmation step
            amount: amount / 100, // Return dollar amount for verification
            data: { id: paymentIntent.id } // Backward compatibility for frontend
        });
    } catch (error) {
        try { await client.query('ROLLBACK'); } catch (_) { }
        logger.error('Error creating payment intent:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
};

const paymentService = require('../services/payment.service');

exports.confirmPayment = async (req, res) => {
    try {
        const { paymentIntentId, reservationId, reservationIntent, order } = req.body;

        if (!paymentIntentId) {
            return res.status(400).json({ success: false, message: 'Payment intent ID is required' });
        }

        // Verify payment status with Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ success: false, message: `Payment not successful (status: ${paymentIntent.status})` });
        }

        // Auth check for reservation ownership
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        let userId = null;
        if (token) {
            try { userId = jwtLib.verify(token, process.env.JWT_SECRET)?.sub || null; } catch { }
        }

        // If confirming a reservation, require a valid JWT.
        if ((reservationId || reservationIntent) && !userId) {
            return res.status(401).json({ success: false, message: 'Authentication required for reservation confirmation' });
        }

        const result = await paymentService.confirmPaymentLogic({
            paymentIntentId,
            paymentStatus: paymentIntent.status,
            reservationId,
            reservationIntent,
            userId
        });

        // Optionally create the associated order in the same trusted server-side step.
        if (result.success && order) {
            const rawTip = paymentIntent.metadata?.tipAmount ?? order.tip_amount ?? 0;
            const tipCents = Math.max(0, Math.round(Number(rawTip) * 100));
            const expectedSubtotalCents = await calculateOrderAmount(
                (order.items || []).map(i => ({ id: i.menu_item_id, quantity: i.quantity }))
            );

            const expectedTotalCents = expectedSubtotalCents + tipCents;
            if (expectedTotalCents !== paymentIntent.amount) {
                return res.status(400).json({
                    success: false,
                    message: 'Payment amount mismatch. Please refresh and try again.'
                });
            }

            const baseCents = Math.max(0, paymentIntent.amount - tipCents);

            const confirmedReservation = result.data && result.data.id ? result.data : null;
            const finalReservationId = order.order_type === 'pre-order'
                ? (confirmedReservation?.id || (reservationId ? parseInt(reservationId, 10) : null))
                : null;

            const created = await orderService.createOrder({
                table_id: order.table_id ?? null,
                restaurant_id: order.restaurant_id ?? null,
                order_type: order.order_type,
                reservation_id: finalReservationId,
                scheduled_for: order.scheduled_for ?? null,
                customer_notes: order.customer_notes ?? '',
                items: order.items || [],
                payment_status: 'completed',
                payment_method: 'stripe',
                payment_intent_id: paymentIntentId,
                payment_amount: baseCents / 100,
                tip_amount: tipCents / 100,
                user_id: userId ? parseInt(userId, 10) : null,
            });

            return res.json({
                ...result,
                order: new OrderDTO(created)
            });
        }

        if (result.success) {
            return res.json(result);
        } else {
            return res.status(400).json(result);
        }
    } catch (error) {
        logger.error('Error confirming payment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.refundPayment = async (req, res) => {
    const client = await pool.connect();
    try {
        const { paymentIntentId, amount, reason, reservationId } = req.body;

        const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount: amount ? Math.round(amount * 100) : undefined,
            reason: reason || 'requested_by_customer',
        });

        if (reservationId) {
            await client.query('BEGIN');
            const updated = await client.query(
                `UPDATE reservations SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
                [reservationId]
            );

            const row = updated.rows[0];
            if (row && row.table_id) {
                await client.query("UPDATE tables SET status = 'available', updated_at = NOW() WHERE id = $1", [row.table_id]);
            }

            await client.query('COMMIT');
            return res.json({ success: true, refund, reservation: updated.rows[0] });
        }

        res.json({ success: true, refund });
    } catch (error) {
        try { await client.query('ROLLBACK'); } catch (_) { }
        logger.error('Error processing refund:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
};

exports.getPaymentIntent = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ success: false, message: 'Payment Intent ID is required' });
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(id);

        res.json({
            success: true,
            data: paymentIntent
        });
    } catch (error) {
        logger.error('Error retrieving payment intent:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

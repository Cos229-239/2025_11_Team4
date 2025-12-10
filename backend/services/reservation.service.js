const { pool } = require('../config/database');
const { getReservationDurationMinutes, getCancellationWindowHours } = require('../utils/settings.service');
const { sendEmail } = require('../utils/email.service');
const { reservationCreated } = require('../utils/email.templates');
const { buildReservationICS } = require('../utils/ics');
const logger = require('../utils/logger');
const { withTransaction } = require('../utils/dbHelpers');

class ReservationService {
    /**
     * Create a tentative reservation
     */
    async createTentative(data, user_id) {
        return withTransaction(async (client) => {
            const {
                restaurant_id,
                table_id,
                customer_name,
                customer_phone,
                customer_email,
                party_size,
                reservation_date,
                reservation_time,
                special_requests
            } = data;

            // 1. Validation (Business Logic)
            if (table_id) {
                const tableCheck = await client.query(
                    'SELECT * FROM tables WHERE id = $1 AND restaurant_id = $2',
                    [table_id, restaurant_id]
                );

                if (tableCheck.rows.length === 0) {
                    throw { status: 404, message: 'Table not found or does not belong to this restaurant' };
                }

                const table = tableCheck.rows[0];
                if (table.capacity < party_size) {
                    throw { status: 400, message: `Table capacity (${table.capacity}) is insufficient for party size (${party_size})` };
                }

                const buffer0 = await getReservationDurationMinutes(restaurant_id);
                const conflictCheck = await client.query(
                    `SELECT * FROM reservations
           WHERE table_id = $1
             AND reservation_date = $2
             AND status IN ('confirmed', 'seated')
             AND (
              (reservation_time <= $3::time AND ($3::time - reservation_time) < ($4 || ' minutes')::interval)
              OR
              (reservation_time > $3::time AND (reservation_time - $3::time) < ($4 || ' minutes')::interval)
             )`,
                    [table_id, reservation_date, reservation_time, buffer0]
                );

                if (conflictCheck.rows.length > 0) {
                    logger.warn(`[RESERVATION] Conflict detected for table ${table_id} at ${reservation_date} ${reservation_time}`);
                    throw { status: 409, message: 'Table is already reserved for this time slot' };
                }
            }

            // 2. Insert
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
            const insertQuery = `
        INSERT INTO reservations (
          restaurant_id, table_id, user_id, customer_name, customer_phone,
          customer_email, party_size, reservation_date, reservation_time,
          special_requests, status, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'tentative', $11)
        RETURNING *
      `;

            const result = await client.query(insertQuery, [
                restaurant_id,
                table_id || null,
                user_id,
                customer_name,
                customer_phone || null,
                customer_email || null,
                party_size,
                reservation_date,
                reservation_time,
                special_requests || null,
                expiresAt
            ]);

            const reservation = result.rows[0];
            logger.info(`[RESERVATION] Created tentative reservation ${reservation.id}`);

            // 3. Side Effects (Emails) - Return data needed for this
            return { reservation, expiresAt };
        });
    }

    /**
     * Confirm a reservation
     */
    async confirmReservation(id, user_id, payment_id, restaurant_id) {
        return withTransaction(async (client) => {
            // Lock reservation
            const reservationResult = await client.query('SELECT * FROM reservations WHERE id = $1 FOR UPDATE', [id]);
            if (reservationResult.rows.length === 0) {
                throw { status: 404, message: 'Reservation not found' };
            }
            const reservation = reservationResult.rows[0];

            // Validations
            if (restaurant_id && reservation.restaurant_id !== parseInt(restaurant_id)) {
                throw { status: 400, message: 'Wrong restaurant for this reservation' };
            }
            if (reservation.user_id && reservation.user_id !== parseInt(user_id)) {
                throw { status: 403, message: 'Not allowed to confirm this reservation' };
            }
            if (reservation.status === 'confirmed') {
                return { updated: reservation, alreadyConfirmed: true };
            }
            if (reservation.status !== 'tentative') {
                throw { status: 400, message: `Cannot confirm reservation with status '${reservation.status}'` };
            }

            // Expiry Check
            const now = new Date();
            const expiresAt = reservation.expires_at ? new Date(reservation.expires_at) : null;
            if (expiresAt && expiresAt < now) {
                await client.query("UPDATE reservations SET status = 'expired', updated_at = NOW() WHERE id = $1", [id]);
                throw { status: 410, message: 'Reservation expired before confirmation' };
            }

            // Conflict Check
            const buffer1 = await getReservationDurationMinutes(reservation.restaurant_id);
            const conflictCheck = await client.query(
                `SELECT * FROM check_reservation_conflicts($1, $2, $3, $4, $5)`,
                [id, reservation.table_id, reservation.reservation_date, reservation.reservation_time, buffer1]
            );

            if (conflictCheck.rows.length > 0) {
                await client.query("UPDATE reservations SET status = 'expired', updated_at = NOW() WHERE id = $1", [id]);
                throw { status: 409, message: 'Time slot no longer available' };
            }

            // Confirm
            const update = await client.query(
                `UPDATE reservations
         SET status = 'confirmed',
             payment_id = $1,
             confirmed_at = NOW(),
             expires_at = NULL,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
                [payment_id, id]
            );

            const updatedRow = update.rows[0];

            // Update Table Status
            if (updatedRow.table_id) {
                await client.query("UPDATE tables SET status = 'reserved', updated_at = NOW() WHERE id = $1", [updatedRow.table_id]);
            }

            return { updated: updatedRow };
        });
    }

    async getReservationById(id) {
        const query = `
          SELECT
            r.*,
            rest.name as restaurant_name,
            rest.address as restaurant_address,
            rest.phone as restaurant_phone,
            t.table_number,
            t.capacity as table_capacity
          FROM reservations r
          JOIN restaurants rest ON r.restaurant_id = rest.id
          LEFT JOIN tables t ON r.table_id = t.id
          WHERE r.id = $1
        `;
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw { status: 404, message: 'Reservation not found' };
        }
        return result.rows[0];
    }

    async getUserReservations(user_id) {
        const query = `
          SELECT
            r.*,
            rest.name as restaurant_name,
            rest.timezone as restaurant_timezone,
            t.table_number,
            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', o.id,
                    'total_amount', o.total_amount,
                    'status', o.status,
                    'items', COALESCE(
                      (
                        SELECT json_agg(
                          json_build_object(
                            'name', oi.menu_item_name,
                            'quantity', oi.quantity,
                            'price', oi.menu_item_price,
                            'subtotal', oi.subtotal
                          )
                        )
                        FROM order_items oi
                        WHERE oi.order_id = o.id
                      ),
                      '[]'::json
                    )
                  )
                )
                FROM orders o
                WHERE o.reservation_id = r.id
              ),
              '[]'::json
            ) as orders
          FROM reservations r
          JOIN restaurants rest ON r.restaurant_id = rest.id
          LEFT JOIN tables t ON r.table_id = t.id
          WHERE r.user_id = $1
          ORDER BY r.reservation_date DESC, r.reservation_time DESC`;
        const result = await pool.query(query, [user_id]);
        return result.rows;
    }

    async listReservations(filters) {
        const { restaurant_id, date, status, phone, email, user_id } = filters;
        let query = `
          SELECT
            r.*,
            rest.name as restaurant_name,
            t.table_number
          FROM reservations r
          JOIN restaurants rest ON r.restaurant_id = rest.id
          LEFT JOIN tables t ON r.table_id = t.id
          WHERE 1=1
        `;
        const params = [];
        if (restaurant_id) { params.push(restaurant_id); query += ` AND r.restaurant_id = $${params.length}`; }
        if (date) { params.push(date); query += ` AND r.reservation_date = $${params.length}`; }
        if (status) { params.push(status); query += ` AND r.status = $${params.length}`; }
        if (phone) { params.push(phone); query += ` AND r.customer_phone = $${params.length}`; }
        if (email) { params.push(email); query += ` AND r.customer_email = $${params.length}`; }
        if (user_id) { params.push(user_id); query += ` AND r.user_id = $${params.length}`; }

        query += ' ORDER BY r.reservation_date DESC, r.reservation_time DESC';
        const result = await pool.query(query, params);
        return result.rows;
    }

    async updateStatus(id, status) {
        const validStatuses = ['tentative', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show'];
        if (!validStatuses.includes(status)) {
            throw { status: 400, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` };
        }

        return withTransaction(async (client) => {
            // Enforce cancellation logic
            if (status === 'cancelled') {
                const fetch = await client.query('SELECT * FROM reservations WHERE id = $1', [id]);
                if (fetch.rows.length === 0) throw { status: 404, message: 'Reservation not found', code: 'RESERVATION_NOT_FOUND' };
                const r = fetch.rows[0];
                const startTs = new Date(`${r.reservation_date.toISOString().substring(0, 10)}T${r.reservation_time}`);
                const now = new Date();
                const hoursUntil = (startTs.getTime() - now.getTime()) / (1000 * 60 * 60);
                const windowHours = await getCancellationWindowHours(r.restaurant_id);

                if (r.status !== 'tentative' && hoursUntil < windowHours) {
                    throw {
                        status: 400,
                        code: 'CANCELLATION_WINDOW_PASSED',
                        message: `Cancellations are only allowed more than ${windowHours} hours before your reservation time`
                    };
                }
                if (['completed', 'no-show', 'expired'].includes(r.status)) {
                    throw {
                        status: 400,
                        code: 'INVALID_RESERVATION_STATUS',
                        message: `Cannot cancel a ${r.status} reservation`
                    };
                }
            }

            const result = await client.query(
                'UPDATE reservations SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
                [status, id]
            );
            if (result.rows.length === 0) throw { status: 404, message: 'Reservation not found' };
            const updated = result.rows[0];

            if (updated.table_id && status === 'seated') {
                await client.query("UPDATE tables SET status = 'occupied', updated_at = NOW() WHERE id = $1", [updated.table_id]);
            }
            if (updated.table_id && ['completed', 'cancelled', 'no-show'].includes(status)) {
                const check = await client.query("SELECT COUNT(*)::int AS cnt FROM reservations WHERE table_id = $1 AND status = 'seated'", [updated.table_id]);
                if (check.rows[0].cnt === 0) {
                    await client.query("UPDATE tables SET status = 'available', updated_at = NOW() WHERE id = $1", [updated.table_id]);
                }
            }
            return updated;
        });
    }

    async createIntent(data, user_id) {
        const jwt = require('jsonwebtoken');
        const { restaurant_id, table_id, customer_name, party_size, reservation_date, reservation_time, special_requests } = data;

        if (!restaurant_id || !customer_name || !party_size || !reservation_date || !reservation_time) {
            throw { status: 400, message: 'Missing required fields' };
        }

        if (table_id) {
            const client = await pool.connect();
            try {
                const tableCheck = await client.query('SELECT capacity FROM tables WHERE id = $1', [table_id]);
                if (tableCheck.rows.length === 0) throw { status: 404, message: 'Table not found' };
                if (tableCheck.rows[0].capacity < party_size) throw { status: 400, message: 'Table insufficient capacity' };

                const buffer = await getReservationDurationMinutes(restaurant_id);
                // Simple conflict check (non-locking)
                const conflictCheck = await client.query(
                    `SELECT id FROM reservations
                    WHERE table_id = $1 AND reservation_date = $2 AND status IN ('confirmed', 'seated')
                    AND (
                    (reservation_time <= $3::time AND ($3::time - reservation_time) < ($4 || ' minutes')::interval)
                    OR
                    (reservation_time > $3::time AND (reservation_time - $3::time) < ($4 || ' minutes')::interval)
                    )`,
                    [table_id, reservation_date, reservation_time, buffer]
                );
                if (conflictCheck.rows.length > 0) {
                    logger.warn('[INTENT] Conflict detected');
                    throw { status: 409, message: 'Table already reserved' };
                }
            } finally {
                client.release();
            }
        }

        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        const secret = process.env.JWT_SECRET;
        if (!secret) throw { status: 500, message: 'JWT_SECRET not configured' };

        const payload = { ...data, user_id: Number(user_id), expires_at: expiresAt.toISOString() };
        const intentToken = jwt.sign(payload, secret, { expiresIn: '20m' });

        return { intentToken, expiresAt: expiresAt.toISOString() };
    }

    async verifyIntent(intentToken) {
        const jwt = require('jsonwebtoken');
        if (!intentToken) throw { status: 400, message: 'Intent token required', code: 'INTENT_REQUIRED' };

        try {
            return jwt.verify(intentToken, process.env.JWT_SECRET);
        } catch (err) {
            const isExpired = err.name === 'TokenExpiredError';
            throw {
                status: isExpired ? 410 : 400,
                code: isExpired ? 'INTENT_EXPIRED' : 'INTENT_INVALID',
                message: isExpired ? 'Intent expired' : 'Invalid intent'
            };
        }
    }
    async verifyReservationAvailability(id, restaurant_id) {
        return withTransaction(async (client) => {
            // Locking read
            const result = await client.query('SELECT * FROM reservations WHERE id = $1 FOR UPDATE', [id]);
            if (result.rows.length === 0) throw { status: 404, message: 'Reservation not found', code: 'RESERVATION_NOT_FOUND' };

            const reservation = result.rows[0];

            if (restaurant_id && reservation.restaurant_id !== parseInt(restaurant_id)) {
                throw { status: 400, message: 'Wrong restaurant', code: 'WRONG_RESTAURANT' };
            }

            if (reservation.status === 'confirmed') {
                return { reservation, alreadyConfirmed: true };
            }

            // Expiry check
            if (reservation.status === 'tentative') {
                const now = new Date();
                const expiresAt = new Date(reservation.expires_at);
                if (expiresAt < now) {
                    await client.query("UPDATE reservations SET status = 'expired', updated_at = NOW() WHERE id = $1", [id]);
                    throw { status: 410, message: 'Reservation expired', code: 'RESERVATION_EXPIRED', expiresAt, expiredMinutesAgo: Math.floor((now - expiresAt) / 60000) };
                }
            }

            // Conflict check
            const buffer = await getReservationDurationMinutes(reservation.restaurant_id);
            const conflictCheck = await client.query(
                `SELECT * FROM check_reservation_conflicts($1, $2, $3, $4, $5)`,
                [id, reservation.table_id, reservation.reservation_date, reservation.reservation_time, buffer]
            );

            if (conflictCheck.rows.length > 0) {
                await client.query("UPDATE reservations SET status = 'expired', updated_at = NOW() WHERE id = $1", [id]);
                throw { status: 409, message: 'Conflict detected', code: 'RESERVATION_CONFLICT', conflictingReservation: conflictCheck.rows[0] };
            }

            // Extend expiration by 5 minutes for payment
            const newExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
            await client.query("UPDATE reservations SET expires_at = $1, updated_at = NOW() WHERE id = $2", [newExpiresAt, id]);

            return { reservation: { ...reservation, expires_at: newExpiresAt } };
        });
    }

    async checkInReservation(id, io) {
        return withTransaction(async (client) => {
            const updateRes = await client.query(
                "UPDATE reservations SET customer_arrived = true, arrival_time = NOW(), status = 'seated', updated_at = NOW() WHERE id = $1 RETURNING *",
                [id]
            );
            if (updateRes.rows.length === 0) throw { status: 404, message: 'Reservation not found' };

            const reservation = updateRes.rows[0];
            if (reservation.table_id) {
                await client.query("UPDATE tables SET status = 'occupied', updated_at = NOW() WHERE id = $1", [reservation.table_id]);
            }

            let kitchenNotified = false;
            if (reservation.has_pre_order) {
                const orderRes = await client.query("SELECT * FROM orders WHERE reservation_id = $1 AND order_type = 'pre-order'", [id]);
                if (orderRes.rows.length > 0) {
                    const order = orderRes.rows[0];
                    if (io) {
                        io.to('kitchen').emit('customer-arrived', {
                            reservationId: id,
                            orderId: order.id,
                            message: 'Customer arrived early - start preparing now',
                            tableNumber: reservation.table_id
                        });
                    }
                    await client.query("UPDATE reservations SET kitchen_notified = true WHERE id = $1", [id]);
                    kitchenNotified = true;
                }
            }
            return { reservation, kitchenNotified };
        });
    }

    async getTodayReservations(restaurant_id) {
        const today = new Date().toISOString().split('T')[0];
        const query = `
           SELECT r.*, t.table_number, t.capacity as table_capacity
           FROM reservations r
           LEFT JOIN tables t ON r.table_id = t.id
           WHERE r.restaurant_id = $1 AND r.reservation_date = $2 AND r.status NOT IN ('cancelled', 'no-show')
           ORDER BY r.reservation_time ASC
         `;
        const result = await pool.query(query, [restaurant_id, today]);
        return { reservations: result.rows, date: today };
    }
}

module.exports = new ReservationService();

const { pool } = require('../config/database');
const jwtLib = require('jsonwebtoken');

/**
 * Confirm payment and update reservation status
 * @param {Object} params
 * @param {string} params.paymentIntentId
 * @param {string} params.paymentStatus
 * @param {string} [params.reservationId]
 * @param {string} [params.reservationIntent]
 * @param {string} [params.userId] - Optional user ID for authorization check
 * @returns {Promise<Object>} Result of the operation
 */
exports.confirmPaymentLogic = async ({ paymentIntentId, paymentStatus, reservationId, reservationIntent, userId }) => {
    const client = await pool.connect();
    try {
        const paymentConfirmation = {
            id: paymentIntentId,
            status: paymentStatus,
            confirmedAt: new Date().toISOString()
        };

        // Reservation Confirmation Logic
        if (reservationId) {
            await client.query('BEGIN');

            const r = await client.query('SELECT * FROM reservations WHERE id = $1 FOR UPDATE', [reservationId]);
            if (r.rowCount === 0) {
                await client.query('ROLLBACK');
                throw new Error('Reservation not found');
            }
            const reservation = r.rows[0];

            if (userId && reservation.user_id && reservation.user_id !== parseInt(userId)) {
                await client.query('ROLLBACK');
                throw new Error('Not allowed to confirm this reservation');
            }

            if (reservation.status === 'confirmed') {
                await client.query('COMMIT');
                return { success: true, message: 'Reservation already confirmed', data: reservation, payment: paymentConfirmation };
            }

            // Confirm reservation
            const update = await client.query(
                `UPDATE reservations
         SET status = 'confirmed', payment_id = $1, confirmed_at = NOW(), expires_at = NULL, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
                [paymentIntentId, reservationId]
            );
            const updated = update.rows[0];

            if (updated.table_id) {
                await client.query("UPDATE tables SET status = 'reserved', updated_at = NOW() WHERE id = $1", [updated.table_id]);
            }

            await client.query('COMMIT');
            return { success: true, message: 'Payment confirmed and reservation updated', data: updated, payment: paymentConfirmation };
        }

        // Reservation Intent Logic (New Reservation)
        if (reservationIntent) {
            await client.query('BEGIN');
            const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
            let intent;
            try {
                intent = jwtLib.verify(reservationIntent, secret);
            } catch (err) {
                await client.query('ROLLBACK');
                throw new Error('Invalid reservation intent');
            }

            const {
                restaurant_id, table_id, user_id: intentUserId, customer_name, customer_phone,
                customer_email, party_size, reservation_date, reservation_time, special_requests
            } = intent;

            // Create confirmed reservation
            const insert = await client.query(
                `INSERT INTO reservations (
           restaurant_id, table_id, user_id, customer_name, customer_phone,
           customer_email, party_size, reservation_date, reservation_time,
           status, special_requests, payment_id, confirmed_at, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
                   'confirmed', $10, $11, NOW(), NOW(), NOW())
         RETURNING *`,
                [
                    restaurant_id, table_id || null, intentUserId || null, customer_name, customer_phone || null,
                    customer_email || null, party_size, reservation_date, reservation_time,
                    special_requests || null, paymentIntentId
                ]
            );

            const created = insert.rows[0];
            if (created.table_id) {
                await client.query("UPDATE tables SET status = 'reserved', updated_at = NOW() WHERE id = $1", [created.table_id]);
            }

            await client.query('COMMIT');
            return { success: true, message: 'Payment confirmed and reservation created', data: created, payment: paymentConfirmation };
        }

        return { success: true, data: paymentConfirmation };
    } catch (error) {
        try { await client.query('ROLLBACK'); } catch (_) { }
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Payment Routes
 * Handles Square payment processing for orders
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const jwtLib = require('jsonwebtoken');

/**
 * POST /api/payments/create-intent
 * Create a payment intent for an order
 * Body: { amount, currency, orderId }
 */
router.post('/create-intent', async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount, currency = 'USD', orderId, reservationId } = req.body || {};

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    // If linked to a reservation, ensure it is tentative and not expired; extend hold a bit
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

    // Mock payment intent (replace with Square API)
    const paymentIntent = {
      id: `pi_mock_${Date.now()}`,
      amount,
      currency,
      status: 'pending',
      clientSecret: `secret_${Date.now()}`,
      reservationId: reservationId || null,
      orderId: orderId || null
    };

    res.json({ success: true, data: paymentIntent });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Error creating payment intent:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment intent', error: error.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/payments/confirm
 * Confirm a payment and finalize the order
 * Body: { paymentIntentId, orderId }
 */
router.post('/confirm', async (req, res) => {
  const client = await pool.connect();
  try {
    const { paymentIntentId, reservationId, reservationIntent, orderId } = req.body || {};
    if (!paymentIntentId) {
      return res.status(400).json({ success: false, message: 'Payment intent ID is required' });
    }

    // Auth is recommended for customer confirm
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    let userId = null;
    if (token) {
      try { userId = jwtLib.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me')?.sub || null; } catch {}
    }

    // Mock verification success with provider
    const paymentConfirmation = {
      id: paymentIntentId,
      status: 'completed',
      confirmedAt: new Date().toISOString()
    };

    // If tied to a reservation, atomically confirm it
    if (reservationId) {
      await client.query('BEGIN');

      const r = await client.query('SELECT * FROM reservations WHERE id = $1 FOR UPDATE', [reservationId]);
      if (r.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Reservation not found' });
      }
      const reservation = r.rows[0];

      // Optional ownership check
      if (reservation.user_id && userId && reservation.user_id !== parseInt(userId)) {
        await client.query('ROLLBACK');
        return res.status(403).json({ success: false, message: 'Not allowed to confirm this reservation' });
      }

      if (reservation.status === 'confirmed') {
        await client.query('COMMIT');
        return res.json({ success: true, message: 'Reservation already confirmed', data: reservation, payment: paymentConfirmation });
      }
      if (reservation.status !== 'tentative') {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `Invalid reservation status: ${reservation.status}` });
      }

      // Not expired
      const now = new Date();
      const expiresAt = reservation.expires_at ? new Date(reservation.expires_at) : null;
      if (expiresAt && expiresAt < now) {
        await client.query("UPDATE reservations SET status = 'expired', updated_at = NOW() WHERE id = $1", [reservationId]);
        await client.query('COMMIT');
        return res.status(410).json({ success: false, message: 'Reservation expired before confirmation' });
      }

      // Check conflicts (confirmed/seated block)
      const { getReservationDurationMinutes, getCancellationWindowHours } = require('../utils/settings.service');
      const BUFFER_MINUTES = await getReservationDurationMinutes(reservation.restaurant_id);
      const conflictCheck = await client.query(
        `SELECT * FROM check_reservation_conflicts($1, $2, $3, $4, $5)`,
        [reservationId, reservation.table_id, reservation.reservation_date, reservation.reservation_time, BUFFER_MINUTES]
      );
      if (conflictCheck.rowCount > 0) {
        await client.query("UPDATE reservations SET status = 'expired', updated_at = NOW() WHERE id = $1", [reservationId]);
        await client.query('COMMIT');
        return res.status(409).json({ success: false, message: 'Time slot no longer available' });
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

      // Mark table as reserved
      if (updated.table_id) {
        await client.query("UPDATE tables SET status = 'reserved', updated_at = NOW() WHERE id = $1", [updated.table_id]);
      }

      await client.query('COMMIT');
      return res.json({ success: true, message: 'Payment confirmed and reservation updated', data: updated, payment: paymentConfirmation });
    }

    // New flow: reservation intent (no reservation row exists yet).
    // Decode the intent token, re-check availability, then create a confirmed reservation.
    if (reservationIntent) {
      await client.query('BEGIN');

      const jwt = require('jsonwebtoken');
      const secret = process.env.JWT_SECRET || 'dev-secret-change-me';

      let intent;
      try {
        intent = jwt.verify(reservationIntent, secret);
      } catch (err) {
        const isExpired = err && err.name === 'TokenExpiredError';
        await client.query('ROLLBACK');
        return res.status(isExpired ? 410 : 400).json({
          success: false,
          message: isExpired
            ? 'Reservation intent expired before confirmation'
            : 'Invalid reservation intent token'
        });
      }

      const {
        restaurant_id,
        table_id,
        user_id: intentUserId,
        customer_name,
        customer_phone,
        customer_email,
        party_size,
        reservation_date,
        reservation_time,
        special_requests,
        expires_at
      } = intent;

      const now = new Date();
      const intentExpiresAt = expires_at ? new Date(expires_at) : null;
      if (intentExpiresAt && intentExpiresAt < now) {
        await client.query('ROLLBACK');
        return res.status(410).json({
          success: false,
          message: 'Reservation intent expired before confirmation'
        });
      }

      // Optional ownership check: if intent has user_id but the caller has a different userId, reject.
      if (intentUserId && userId && parseInt(userId) !== parseInt(intentUserId)) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          message: 'Not allowed to confirm this reservation'
        });
      }

      // Check conflicts (confirmed/seated block) before inserting the new reservation
      const { getReservationDurationMinutes } = require('../utils/settings.service');
      const BUFFER_MINUTES = await getReservationDurationMinutes(restaurant_id);

      if (table_id) {
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
          [table_id, reservation_date, reservation_time, BUFFER_MINUTES]
        );

        if (conflictCheck.rowCount > 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({
            success: false,
            message: 'Time slot no longer available'
          });
        }
      }

      // Create a confirmed reservation record
      const insert = await client.query(
        `INSERT INTO reservations (
           restaurant_id, table_id, user_id, customer_name, customer_phone,
           customer_email, party_size, reservation_date, reservation_time,
           status, special_requests, payment_id, confirmed_at, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
                   'confirmed', $10, $11, NOW(), NOW(), NOW())
         RETURNING *`,
        [
          restaurant_id,
          table_id || null,
          intentUserId || null,
          customer_name,
          customer_phone || null,
          customer_email || null,
          party_size,
          reservation_date,
          reservation_time,
          special_requests || null,
          paymentIntentId
        ]
      );

      const created = insert.rows[0];

      // Mark table as reserved
      if (created.table_id) {
        await client.query(
          "UPDATE tables SET status = 'reserved', updated_at = NOW() WHERE id = $1",
          [created.table_id]
        );
      }

      await client.query('COMMIT');
      return res.json({
        success: true,
        message: 'Payment confirmed and reservation created',
        data: created,
        payment: paymentConfirmation
      });
    }

    // Otherwise return payment confirmation only
    res.json({ success: true, data: paymentConfirmation });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Error confirming payment:', error);
    res.status(500).json({ success: false, message: 'Failed to confirm payment', error: error.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/payments/refund
 * Process a refund for a cancelled order
 * Body: { paymentIntentId, amount, reason }
 */
router.post('/refund', async (req, res) => {
  const client = await pool.connect();
  try {
    const { paymentIntentId, amount, reason, reservationId } = req.body || {};
    if (!paymentIntentId || !amount) {
      return res.status(400).json({ success: false, message: 'Payment intent ID and amount are required' });
    }

    // Mock refund success with provider
    const refund = {
      id: `refund_${Date.now()}`,
      paymentIntentId,
      amount,
      reason,
      status: 'completed',
      refundedAt: new Date().toISOString()
    };

    // If reservation specified, enforce 12-hour policy, cancel it and free table
    if (reservationId) {
      await client.query('BEGIN');
      const r = await client.query('SELECT * FROM reservations WHERE id = $1 FOR UPDATE', [reservationId]);
      if (r.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Reservation not found' });
      }
      const reservation = r.rows[0];

      // Only cancel confirmed/tentative reservations
      if (!['confirmed', 'tentative'].includes(reservation.status)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `Cannot refund for status ${reservation.status}` });
      }

      // Enforce policy window for confirmed reservations: non-refundable inside window
      const startTs = new Date(`${reservation.reservation_date.toISOString().substring(0,10)}T${reservation.reservation_time}`);
      const now = new Date();
      const hoursUntil = (startTs.getTime() - now.getTime()) / (1000 * 60 * 60);
      const windowHours = await getCancellationWindowHours(reservation.restaurant_id);
      if (reservation.status === 'confirmed' && hoursUntil < windowHours) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          code: 'REFUND_WINDOW_PASSED',
          message: `Refunds are not allowed within ${windowHours} hours of the reservation time`
        });
      }

      const updated = await client.query(
        `UPDATE reservations SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [reservationId]
      );

      // Free table if no other seated reservation
      const row = updated.rows[0];
      if (row.table_id) {
        const check = await client.query(
          `SELECT COUNT(*)::int AS cnt FROM reservations WHERE table_id = $1 AND status = 'seated'`,
          [row.table_id]
        );
        if (check.rows[0].cnt === 0) {
          await client.query("UPDATE tables SET status = 'available', updated_at = NOW() WHERE id = $1", [row.table_id]);
        }
      }

      await client.query('COMMIT');
      return res.json({ success: true, data: refund, reservation: updated.rows[0], message: 'Refund processed and reservation cancelled' });
    }

    res.json({ success: true, data: refund });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Error processing refund:', error);
    res.status(500).json({ success: false, message: 'Failed to process refund', error: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;

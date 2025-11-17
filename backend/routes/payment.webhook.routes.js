const express = require('express');
const crypto = require('crypto');
const { pool } = require('../config/database');

const router = express.Router();

// Route-specific raw body parser is required for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const enabled = (process.env.SQUARE_WEBHOOK_ENABLED || 'true').toLowerCase() === 'true';
    if (!enabled) return res.status(204).end();

    const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    if (!signatureKey) {
      console.warn('[SQUARE] Webhook signature key not set. Skipping verification.');
    }

    const bodyBuffer = req.body; // Buffer since we used express.raw
    const rawBody = Buffer.isBuffer(bodyBuffer) ? bodyBuffer : Buffer.from(JSON.stringify(bodyBuffer || {}));

    // Verify HMAC-SHA256 signature if header and key are present
    const headerSig = req.header('x-square-hmacsha256-signature');
    if (signatureKey && headerSig) {
      const hmac = crypto.createHmac('sha256', signatureKey);
      hmac.update(rawBody);
      const digest = hmac.digest('base64');
      if (digest !== headerSig) {
        console.warn('[SQUARE] Invalid webhook signature');
        return res.status(400).json({ success: false, message: 'Invalid signature' });
      }
    }

    // Parse event JSON
    let event;
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid JSON' });
    }

    const type = event?.type || event?.event_type || '';
    const eventId = event?.id || event?.event_id || null;
    // Idempotency guard
    if (eventId) {
      try {
        const ins = await pool.query('INSERT INTO webhook_events(id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id', [eventId]);
        if (ins.rowCount === 0) {
          return res.status(200).json({ success: true, message: 'Duplicate event ignored' });
        }
      } catch (e) {
        console.warn('[SQUARE] Idempotency insert failed:', e.message);
      }
    }

    const isPaymentEvent = /payments\.(created|updated)/i.test(type);
    const isRefundEvent = /refunds\.(created|updated)/i.test(type);

    const payment = event?.data?.object?.payment || event?.data?.payment || {};
    const paymentId = payment?.id;
    const status = payment?.status || payment?.payment_status || '';

    // Extract reservationId dynamically
    const ref = payment?.reference_id || payment?.order_id || payment?.note || '';
    let reservationId = null;
    if (ref) {
      const match = String(ref).match(/reservation[_:-]?([0-9]+)/i);
      if (match) reservationId = parseInt(match[1], 10);
      if (!reservationId && /^\d+$/.test(String(ref))) reservationId = parseInt(ref, 10);
    }
    if (!reservationId && payment?.metadata && payment.metadata.reservation_id) {
      reservationId = parseInt(payment.metadata.reservation_id, 10);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Handle refund events: cancel reservation tied to refunded payment
      if (isRefundEvent) {
        const refund = event?.data?.object?.refund || event?.data?.refund || {};
        const refundStatus = refund?.status || '';
        const refundPaymentId = refund?.payment_id || null;
        if (/COMPLETED/i.test(refundStatus) && refundPaymentId) {
          const r = await client.query('SELECT * FROM reservations WHERE payment_id = $1 FOR UPDATE', [refundPaymentId]);
          const row = r.rows[0];
          if (row && ['confirmed', 'tentative'].includes(row.status)) {
            const cancelled = await client.query(
              `UPDATE reservations SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
              [row.id]
            );
            if (cancelled.rows[0]?.table_id) {
              const check = await client.query(
                `SELECT COUNT(*)::int AS cnt FROM reservations WHERE table_id = $1 AND status = 'seated'`,
                [cancelled.rows[0].table_id]
              );
              if (check.rows[0].cnt === 0) {
                await client.query("UPDATE tables SET status = 'available', updated_at = NOW() WHERE id = $1", [cancelled.rows[0].table_id]);
              }
            }
          }
        }
        await client.query('COMMIT');
        return res.status(200).json({ success: true, message: 'Processed refund event' });
      }

      // Process only completed payment events
      const isCompletedEvent = isPaymentEvent && /COMPLETED/i.test(status);
      if (!isCompletedEvent) {
        await client.query('COMMIT');
        return res.status(200).json({ success: true, message: 'Ignored event', type, status });
      }

      let reservationRow = null;

      if (reservationId) {
        const r = await client.query('SELECT * FROM reservations WHERE id = $1 FOR UPDATE', [reservationId]);
        reservationRow = r.rows[0] || null;
      }

      // Fallback: locate by payment_id if already saved
      if (!reservationRow && paymentId) {
        const r = await client.query('SELECT * FROM reservations WHERE payment_id = $1 FOR UPDATE', [paymentId]);
        reservationRow = r.rows[0] || null;
      }

      if (!reservationRow) {
        await client.query('COMMIT');
        console.warn(`[SQUARE] Webhook: no reservation found for payment ${paymentId} (ref: ${ref || 'n/a'})`);
        return res.status(200).json({ success: true, message: 'No matching reservation' });
      }

      // Idempotency: already confirmed
      if (reservationRow.status === 'confirmed') {
        await client.query('COMMIT');
        return res.status(200).json({ success: true, message: 'Already confirmed', reservationId: reservationRow.id });
      }

      // Only confirm tentative, not expired
      if (reservationRow.status !== 'tentative') {
        await client.query('COMMIT');
        return res.status(200).json({ success: true, message: `Skipping status ${reservationRow.status}` });
      }

      if (reservationRow.expires_at && new Date(reservationRow.expires_at) < new Date()) {
        // Mark expired
        await client.query("UPDATE reservations SET status = 'expired', updated_at = NOW() WHERE id = $1", [reservationRow.id]);
        await client.query('COMMIT');
        return res.status(200).json({ success: true, message: 'Reservation expired before payment' });
      }

      // Confirm if no conflicts
      const { getReservationDurationMinutes } = require('../utils/settings.service');
      const BUFFER_MINUTES = await getReservationDurationMinutes(reservationRow.restaurant_id);
      const conflict = await client.query(
        `SELECT * FROM check_reservation_conflicts($1, $2, $3, $4, $5)`,
        [reservationRow.id, reservationRow.table_id, reservationRow.reservation_date, reservationRow.reservation_time, BUFFER_MINUTES]
      );
      if (conflict.rowCount > 0) {
        await client.query("UPDATE reservations SET status = 'expired', updated_at = NOW() WHERE id = $1", [reservationRow.id]);
        await client.query('COMMIT');
        return res.status(200).json({ success: true, message: 'Slot taken; expired reservation' });
      }

      const updated = await client.query(
        `UPDATE reservations
         SET status = 'confirmed', payment_id = $1, confirmed_at = NOW(), expires_at = NULL, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [paymentId || null, reservationRow.id]
      );

      if (updated.rows[0]?.table_id) {
        await client.query("UPDATE tables SET status = 'reserved', updated_at = NOW() WHERE id = $1", [updated.rows[0].table_id]);
      }

      await client.query('COMMIT');
      return res.status(200).json({ success: true, message: 'Reservation confirmed via webhook', reservation: updated.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[SQUARE] Webhook processing error:', err);
      return res.status(500).json({ success: false, message: 'Webhook processing failed' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[SQUARE] Webhook error:', error);
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
});

module.exports = router;

/**
 * Reservation Routes
 * API endpoints for managing table reservations
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { getReservationDurationMinutes, getCancellationWindowHours } = require('../utils/settings.service');
const { sendEmail } = require('../utils/email.service');
const { reservationCreated } = require('../utils/email.templates');
const { buildReservationICS } = require('../utils/ics');

/**
 * POST /api/reservations
 * Create a new reservation (legacy / tentative flow)
 *
 * Note: For new integrations that require "no reservation without payment",
 * prefer the intent-based flow:
 *   - POST /api/reservations/intent
 *   - POST /api/payments/create-intent
 *   - POST /api/payments/confirm (with reservationIntent)
 * which only creates a real reservation row after payment succeeds.
 */
router.post('/', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

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
    } = req.body;

    // Require authenticated user and derive user_id from JWT
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      await client.query('ROLLBACK');
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    let user_id;
    try {
      const jwt = require('jsonwebtoken');
      const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
      const payload = jwt.verify(token, secret);
      user_id = payload?.sub;
      if (!user_id) throw new Error('invalid token payload');
    } catch (e) {
      await client.query('ROLLBACK');
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Validation
    if (!restaurant_id || !customer_name || !party_size || !reservation_date || !reservation_time) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: restaurant_id, customer_name, party_size, reservation_date, reservation_time'
      });
    }

    // Check if table exists and belongs to restaurant (if table_id provided)
    if (table_id) {
      const tableCheck = await client.query(
        'SELECT * FROM tables WHERE id = $1 AND restaurant_id = $2',
        [table_id, restaurant_id]
      );

      if (tableCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Table not found or does not belong to this restaurant'
        });
      }

      // Check if table can accommodate party size
      const table = tableCheck.rows[0];
      if (table.capacity < party_size) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Table capacity (${table.capacity}) is insufficient for party size (${party_size})`
        });
      }

      // Check if table is already CONFIRMED for this time
      // NOTE: Allow multiple tentative reservations (first to pay wins)
      const buffer0 = await getReservationDurationMinutes(restaurant_id);
      const conflictCheck = await client.query(
        `SELECT * FROM reservations
         WHERE table_id = $1
           AND reservation_date = $2
           AND status IN ('confirmed', 'seated')  -- Only check confirmed reservations
           AND (
             -- Check for time overlap (assuming 90-minute duration)
            (reservation_time <= $3::time AND ($3::time - reservation_time) < ($4 || ' minutes')::interval)
            OR
            (reservation_time > $3::time AND (reservation_time - $3::time) < ($4 || ' minutes')::interval)
           )`,
        [table_id, reservation_date, reservation_time, buffer0]
      );

      if (conflictCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        console.warn(`[RESERVATION] Conflict detected for table ${table_id} at ${reservation_date} ${reservation_time}`);
        return res.status(409).json({
          success: false,
          message: 'Table is already reserved for this time slot'
        });
      }
    }

    // Create TENTATIVE reservation (payment-first flow)
    // Expires in 15 minutes - user must complete payment to confirm
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

    console.log(`[RESERVATION] Created tentative reservation ${result.rows[0].id} (expires at ${expiresAt.toISOString()})`);

    await client.query('COMMIT');

    // Fire-and-forget email (do not block response)
    try {
      if (customer_email) {
        // Load restaurant basics for email context
        const rest = await pool.query('SELECT name, address FROM restaurants WHERE id = $1', [restaurant_id]);
        const reservation = result.rows[0];
        const restaurant = rest.rows[0];
        const tmpl = reservationCreated({ reservation, restaurant });
        const ics = buildReservationICS({ reservation, restaurant });
        sendEmail({
          to: customer_email,
          subject: tmpl.subject,
          text: tmpl.text,
          html: tmpl.html,
          attachments: ics ? [{ filename: ics.filename, content: ics.content, contentType: ics.contentType }] : undefined
        });
      }
    } catch (e) {
      console.warn('Email dispatch error:', e.message);
    }

    res.status(201).json({
      success: true,
      message: 'Tentative reservation created. Complete payment within 15 minutes to confirm.',
      data: result.rows[0],
      expiresIn: '15 minutes',
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create reservation',
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/reservations/:id/confirm
 * Confirm a tentative reservation after successful payment
 * Body: { payment_id, restaurant_id? }
 */
router.post('/:id/confirm', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Auth required
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      await client.query('ROLLBACK');
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
    let payload;
    try { payload = jwt.verify(token, secret); } catch { await client.query('ROLLBACK'); return res.status(401).json({ success: false, message: 'Invalid token' }); }
    const user_id = payload?.sub;

    const { id } = req.params;
    const { payment_id, restaurant_id } = req.body || {};

    if (!payment_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'payment_id is required' });
    }

    // Lock reservation row
    const reservationResult = await client.query('SELECT * FROM reservations WHERE id = $1 FOR UPDATE', [id]);
    if (reservationResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    const reservation = reservationResult.rows[0];

    // Optional: enforce restaurant match
    if (restaurant_id && reservation.restaurant_id !== parseInt(restaurant_id)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Wrong restaurant for this reservation' });
    }

    // Enforce ownership if user_id exists on reservation
    if (reservation.user_id && reservation.user_id !== parseInt(user_id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Not allowed to confirm this reservation' });
    }

    // Idempotent: already confirmed
    if (reservation.status === 'confirmed') {
      await client.query('COMMIT');
      return res.json({ success: true, message: 'Already confirmed', data: reservation, alreadyConfirmed: true });
    }

    // Must be tentative
    if (reservation.status !== 'tentative') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Cannot confirm reservation with status '${reservation.status}'` });
    }

    // Not expired
    const now = new Date();
    const expiresAt = reservation.expires_at ? new Date(reservation.expires_at) : null;
    if (expiresAt && expiresAt < now) {
      await client.query("UPDATE reservations SET status = 'expired', updated_at = NOW() WHERE id = $1", [id]);
      await client.query('COMMIT');
      return res.status(410).json({ success: false, message: 'Reservation expired before confirmation' });
    }

    // Check conflicts against other confirmed/seated reservations
    const buffer1 = await getReservationDurationMinutes(reservation.restaurant_id);
    const conflictCheck = await client.query(
      `SELECT * FROM check_reservation_conflicts($1, $2, $3, $4, $5)`,
      [id, reservation.table_id, reservation.reservation_date, reservation.reservation_time, buffer1]
    );

    if (conflictCheck.rows.length > 0) {
      await client.query("UPDATE reservations SET status = 'expired', updated_at = NOW() WHERE id = $1", [id]);
      await client.query('COMMIT');
      return res.status(409).json({ success: false, message: 'Time slot no longer available' });
    }

    // Confirm reservation
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

    const updated = update.rows[0];

    // Mark table reserved if applies
    if (updated.table_id) {
      await client.query("UPDATE tables SET status = 'reserved', updated_at = NOW() WHERE id = $1", [updated.table_id]);
    }

    await client.query('COMMIT');

    return res.json({ success: true, message: 'Reservation confirmed', data: updated });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error confirming reservation:', error);
    res.status(500).json({ success: false, message: 'Failed to confirm reservation', error: error.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/reservations/intent
 * Create a reservation intent WITHOUT inserting into the reservations table.
 *
 * Body: {
 *   restaurant_id, table_id, customer_name, customer_phone,
 *   customer_email, party_size, reservation_date, reservation_time,
 *   special_requests
 * }
 *
 * Returns: { intentToken, expiresAt }
 * The client must pass this token to /api/payments/confirm, which will
 * atomically create a confirmed reservation after successful payment.
 */
router.post('/intent', async (req, res) => {
  const client = await pool.connect();

  try {
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
    } = req.body || {};

    // Require authenticated user and derive user_id from JWT
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    let user_id;
    try {
      const jwt = require('jsonwebtoken');
      const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
      const payload = jwt.verify(token, secret);
      user_id = payload?.sub;
      if (!user_id) throw new Error('invalid token payload');
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Basic validation
    if (!restaurant_id || !customer_name || !party_size || !reservation_date || !reservation_time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: restaurant_id, customer_name, party_size, reservation_date, reservation_time'
      });
    }

    // If a specific table is requested, validate it and check capacity + conflicts
    if (table_id) {
      const tableCheck = await client.query(
        'SELECT * FROM tables WHERE id = $1 AND restaurant_id = $2',
        [table_id, restaurant_id]
      );

      if (tableCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Table not found or does not belong to this restaurant'
        });
      }

      const table = tableCheck.rows[0];
      if (table.capacity < party_size) {
        return res.status(400).json({
          success: false,
          message: `Table capacity (${table.capacity}) is insufficient for party size (${party_size})`
        });
      }

      // Check conflicts against existing confirmed/seated reservations
      const bufferMinutes = await getReservationDurationMinutes(restaurant_id);
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
        [table_id, reservation_date, reservation_time, bufferMinutes]
      );

      if (conflictCheck.rows.length > 0) {
        console.warn(`[RESERVATION_INTENT] Conflict detected for table ${table_id} at ${reservation_date} ${reservation_time}`);
        return res.status(409).json({
          success: false,
          message: 'Table is already reserved for this time slot'
        });
      }
    }

    // Build intent payload and sign it as a short-lived JWT
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'dev-secret-change-me';

    const intentPayload = {
      restaurant_id: Number(restaurant_id),
      table_id: table_id ? Number(table_id) : null,
      user_id: Number(user_id),
      customer_name,
      customer_phone: customer_phone || null,
      customer_email: customer_email || null,
      party_size: Number(party_size),
      reservation_date,
      reservation_time,
      special_requests: special_requests || null,
      expires_at: expiresAt.toISOString(),
      issued_at: new Date().toISOString()
    };

    const intentToken = jwt.sign(intentPayload, secret, { expiresIn: '20m' });

    return res.json({
      success: true,
      message: 'Reservation intent created. Complete payment within 15 minutes to confirm.',
      data: {
        intentToken,
        expiresAt: expiresAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating reservation intent:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create reservation intent',
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/reservations/:id
 * Get a specific reservation by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

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
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reservation',
      error: error.message
    });
  }
});

/**
 * GET /api/reservations
 * Get all reservations with filters
 * Query params:
 *   - restaurant_id: Filter by restaurant
 *   - date: Filter by date (YYYY-MM-DD)
 *   - status: Filter by status
 *   - phone: Filter by customer phone
 *   - email: Filter by customer email
 *   - user_id: Filter by user id (ignored if column missing)
 */
router.get('/', async (req, res) => {
  try {
    const { restaurant_id, date, status, phone, email, user_id } = req.query;

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

    if (restaurant_id) {
      params.push(restaurant_id);
      query += ` AND r.restaurant_id = $${params.length}`;
    }

    if (date) {
      params.push(date);
      query += ` AND r.reservation_date = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND r.status = $${params.length}`;
    }

    if (phone) {
      params.push(phone);
      query += ` AND r.customer_phone = $${params.length}`;
    }

    if (email) {
      params.push(email);
      query += ` AND r.customer_email = $${params.length}`;
    }

    if (user_id) {
      // Graceful fallback: only filter by user_id if column exists (helps on older DBs)
      try {
        const col = await pool.query(
          `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reservations' AND column_name='user_id'`
        );
        if (col.rowCount > 0) {
          params.push(user_id);
          query += ` AND r.user_id = $${params.length}`;
        }
      } catch (e) {
        // Ignore; proceed without user filter
      }
    }

    query += ' ORDER BY r.reservation_date DESC, r.reservation_time DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reservations',
      error: error.message
    });
  }
});

/**
 * GET /api/reservations/me
 * Returns reservations for the authenticated user (expects Bearer token)
 */
router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Missing token' });
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
    let payload;
    try { payload = jwt.verify(token, secret); } catch { return res.status(401).json({ success: false, message: 'Invalid token' }); }
    const uid = payload.sub;
    if (!uid) return res.status(401).json({ success: false, message: 'Invalid token payload' });

    const query = `
      SELECT
        r.*, rest.name as restaurant_name, t.table_number
      FROM reservations r
      JOIN restaurants rest ON r.restaurant_id = rest.id
      LEFT JOIN tables t ON r.table_id = t.id
      WHERE r.user_id = $1
      ORDER BY r.reservation_date DESC, r.reservation_time DESC`;
    const result = await pool.query(query, [uid]);
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch reservations', error: error.message });
  }
});

/**
 * PATCH /api/reservations/:id/status
 * Update reservation status
 * Body: { status: 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no-show' }
 */
router.patch('/:id/status', async (req, res) => {
  try {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['tentative', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Enforce cancellation policy when setting status to 'cancelled'
    if (status === 'cancelled') {
      const fetch = await pool.query('SELECT * FROM reservations WHERE id = $1', [id]);
      if (fetch.rows.length === 0) {
        return res.status(404).json({ success: false, code: 'RESERVATION_NOT_FOUND', message: 'Reservation not found' });
      }
      const r = fetch.rows[0];
      const startTs = new Date(`${r.reservation_date.toISOString().substring(0,10)}T${r.reservation_time}`);
      const now = new Date();
      const hoursUntil = (startTs.getTime() - now.getTime()) / (1000 * 60 * 60);
      const windowHours = await require('../utils/settings.service').getCancellationWindowHours(r.restaurant_id);
      const isTentative = r.status === 'tentative';
      if (!isTentative && hoursUntil < windowHours) {
        return res.status(400).json({
          success: false,
          code: 'CANCELLATION_WINDOW_PASSED',
          message: `Cancellations are only allowed more than ${windowHours} hours before your reservation time`
        });
      }
      if (['completed', 'no-show', 'expired'].includes(r.status)) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_RESERVATION_STATUS',
          message: `Cannot cancel a ${r.status} reservation`
        });
      }
    }

    const result = await pool.query(
      'UPDATE reservations SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, code: 'RESERVATION_NOT_FOUND', message: 'Reservation not found' });
    }

    const updated = result.rows[0];

    // Seat logic: mark table occupied when status becomes 'seated'
    if (updated.table_id && status === 'seated') {
      await pool.query(
        "UPDATE tables SET status = 'occupied', updated_at = NOW() WHERE id = $1",
        [updated.table_id]
      );
    }

    // Free table when reservation completes/cancels and no other seated reservations on same table
    if (updated.table_id && ['completed', 'cancelled', 'no-show'].includes(status)) {
      const check = await pool.query(
        `SELECT COUNT(*)::int AS cnt FROM reservations
         WHERE table_id = $1 AND status = 'seated'`,
        [updated.table_id]
      );
      if (check.rows[0].cnt === 0) {
        await pool.query(
          "UPDATE tables SET status = 'available', updated_at = NOW() WHERE id = $1",
          [updated.table_id]
        );
      }
    }

    res.json({
      success: true,
      message: 'Reservation status updated',
      data: updated
    });
  } catch (error) {
    console.error('Error updating reservation status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update reservation status',
      error: error.message
    });
  }
});

/**
 * PUT /api/reservations/:id
 * Update reservation details
 * Body: { customer_phone, customer_email, party_size, special_requests, etc. }
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customer_phone,
      customer_email,
      party_size,
      special_requests,
      reservation_date,
      reservation_time
    } = req.body;

    // Build dynamic update query
    const updates = [];
    const params = [];
    let paramCounter = 1;

    if (customer_phone !== undefined) {
      params.push(customer_phone);
      updates.push(`customer_phone = $${paramCounter++}`);
    }
    if (customer_email !== undefined) {
      params.push(customer_email);
      updates.push(`customer_email = $${paramCounter++}`);
    }
    if (party_size !== undefined) {
      params.push(party_size);
      updates.push(`party_size = $${paramCounter++}`);
    }
    if (special_requests !== undefined) {
      params.push(special_requests);
      updates.push(`special_requests = $${paramCounter++}`);
    }
    if (reservation_date !== undefined) {
      params.push(reservation_date);
      updates.push(`reservation_date = $${paramCounter++}`);
    }
    if (reservation_time !== undefined) {
      params.push(reservation_time);
      updates.push(`reservation_time = $${paramCounter++}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const query = `
      UPDATE reservations
      SET ${updates.join(', ')}
      WHERE id = $${paramCounter}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    res.json({
      success: true,
      message: 'Reservation updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update reservation',
      error: error.message
    });
  }
});

/**
 * DELETE /api/reservations/:id
 * Cancel a reservation (soft delete by setting status to 'cancelled')
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Load reservation to enforce cancellation policy (12-hour window)
    const fetch = await pool.query('SELECT * FROM reservations WHERE id = $1', [id]);
    if (fetch.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    const r = fetch.rows[0];

    // Compute reservation start from date+time
    const startTs = new Date(`${r.reservation_date.toISOString().substring(0,10)}T${r.reservation_time}`);
    const now = new Date();
    const msUntil = startTs.getTime() - now.getTime();
    const hoursUntil = msUntil / (1000 * 60 * 60);
    const windowHours = await require('../utils/settings.service').getCancellationWindowHours(r.restaurant_id);

    // Allow cancellation any time for tentative (no payment yet)
    const isTentative = r.status === 'tentative';

    // Disallow cancellation within 12 hours for confirmed/seated
    if (!isTentative && hoursUntil < windowHours) {
      return res.status(400).json({
        success: false,
        code: 'CANCELLATION_WINDOW_PASSED',
        message: `Cancellations are only allowed more than ${windowHours} hours before your reservation time`
      });
    }

    // Disallow cancellation for completed/no-show/expired
    if (['completed', 'no-show', 'expired'].includes(r.status)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_RESERVATION_STATUS',
        message: `Cannot cancel a ${r.status} reservation`
      });
    }

    const result = await pool.query(
      "UPDATE reservations SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, code: 'RESERVATION_NOT_FOUND', message: 'Reservation not found' });
    }

    res.json({
      success: true,
      message: 'Reservation cancelled successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel reservation',
      error: error.message
    });
  }
});

/**
 * GET /api/reservations/restaurant/:restaurant_id/today
 * Get today's reservations for a specific restaurant
 */
router.get('/restaurant/:restaurant_id/today', async (req, res) => {
  try {
    const { restaurant_id } = req.params;
    const today = new Date().toISOString().split('T')[0];

    const query = `
      SELECT
        r.*,
        t.table_number,
        t.capacity as table_capacity
      FROM reservations r
      LEFT JOIN tables t ON r.table_id = t.id
      WHERE r.restaurant_id = $1
        AND r.reservation_date = $2
        AND r.status NOT IN ('cancelled', 'no-show')
      ORDER BY r.reservation_time ASC
    `;

    const result = await pool.query(query, [restaurant_id, today]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      date: today
    });
  } catch (error) {
    console.error('Error fetching today\'s reservations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s reservations',
      error: error.message
    });
  }
});

/**
 * POST /api/reservations/intent/verify
 * Verify a reservation intent (JWT) is still valid before payment.
 *
 * Body: { intentToken }
 *
 * Returns error codes similar to :id/verify but without touching the
 * reservations table, since the real reservation row does not exist yet.
 *
 * NOTE: This route must be defined before the generic "/:id/verify"
 * route so that "intent" is not treated as an :id parameter.
 */
router.post('/intent/verify', async (req, res) => {
  try {
    const { intentToken } = req.body || {};
    if (!intentToken) {
      return res.status(400).json({
        success: false,
        code: 'INTENT_REQUIRED',
        message: 'Reservation intent token is required'
      });
    }

    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'dev-secret-change-me';

    let payload;
    try {
      payload = jwt.verify(intentToken, secret);
    } catch (err) {
      const isExpired = err && err.name === 'TokenExpiredError';
      return res.status(isExpired ? 410 : 400).json({
        success: false,
        code: isExpired ? 'INTENT_EXPIRED' : 'INTENT_INVALID',
        message: isExpired
          ? 'Reservation intent expired. Please start over.'
          : 'Invalid reservation intent token'
      });
    }

    const {
      restaurant_id,
      table_id,
      reservation_date,
      reservation_time
    } = payload;

    // If we are missing key fields or no specific table, skip conflict check and just validate token shape.
    if (!table_id || !restaurant_id || !reservation_date || !reservation_time) {
      return res.json({
        success: true,
        message: 'Reservation intent is valid. Proceed to payment.',
        data: payload
      });
    }

    // Check for conflicts with confirmed/seated reservations.
    // This is an early guard; the payment confirm endpoint will re-check conflicts
    // before actually inserting the reservation row, so if this check fails we
    // prefer to log and allow the flow to continue rather than 500.
    try {
      const restaurantIdNum = parseInt(restaurant_id, 10) || restaurant_id;
      const buffer = await getReservationDurationMinutes(restaurantIdNum);

      const conflictCheck = await pool.query(
        `SELECT * FROM reservations
         WHERE table_id = $1
           AND reservation_date = $2
           AND status IN ('confirmed', 'seated')
           AND (
             (reservation_time <= $3::time AND ($3::time - reservation_time) < ($4 || ' minutes')::interval)
             OR
             (reservation_time > $3::time AND (reservation_time - $3::time) < ($4 || ' minutes')::interval)
           )`,
        [table_id, reservation_date, reservation_time, buffer]
      );

      if (conflictCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          code: 'RESERVATION_CONFLICT',
          message: 'Reservation time no longer available. Another customer booked this slot.',
          conflictingReservation: conflictCheck.rows[0]
        });
      }
    } catch (checkError) {
      console.warn('[VERIFY_INTENT] Conflict check failed, allowing intent to proceed:', checkError.message);
      // Fallback: treat intent as valid here; payment confirmation will re-check.
    }

    return res.json({
      success: true,
      message: 'Reservation intent is valid. Proceed to payment.',
      data: payload
    });
  } catch (error) {
    console.error('[VERIFY_INTENT] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify reservation intent',
      error: error.message
    });
  }
});

/**
 * POST /api/reservations/:id/verify
 * Verify reservation is still valid before payment (CRITICAL FLOW PER FLOWCHART)
 *
 * This endpoint prevents:
 * - Expired reservations from proceeding to payment
 * - Race conditions (two users booking same slot)
 * - Conflicts with confirmed reservations
 *
 * Returns error codes:
 * - RESERVATION_NOT_FOUND: Reservation doesn't exist
 * - RESERVATION_EXPIRED: Time window expired
 * - RESERVATION_CONFLICT: Another user confirmed this slot
 * - WRONG_RESTAURANT: Reservation is for different restaurant
 */
router.post('/:id/verify', async (req, res) => {
  const client = await pool.connect();
  const startTime = Date.now();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { restaurant_id } = req.body;

    console.log(`[VERIFY] Reservation ${id} for restaurant ${restaurant_id}`);

    // Step 1: Get reservation with row-level lock (prevents race conditions)
    const reservationResult = await client.query(
      'SELECT * FROM reservations WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (reservationResult.rows.length === 0) {
      await client.query('ROLLBACK');
      console.warn(`[VERIFY] Reservation ${id} not found`);
      return res.status(404).json({
        success: false,
        code: 'RESERVATION_NOT_FOUND',
        message: 'Reservation not found'
      });
    }

    const reservation = reservationResult.rows[0];
    console.log(`[VERIFY] Reservation ${id} current status: ${reservation.status}`);

    // Step 2: Verify reservation is for correct restaurant
    if (restaurant_id && reservation.restaurant_id !== parseInt(restaurant_id)) {
      await client.query('ROLLBACK');
      console.warn(`[VERIFY] Reservation ${id} restaurant mismatch: ${reservation.restaurant_id} vs ${restaurant_id}`);
      return res.status(400).json({
        success: false,
        code: 'WRONG_RESTAURANT',
        message: 'This reservation is for a different restaurant'
      });
    }

    // Step 3: If already confirmed, return success (idempotent)
    if (reservation.status === 'confirmed') {
      await client.query('COMMIT');
      console.log(`[VERIFY] Reservation ${id} already confirmed`);
      return res.json({
        success: true,
        message: 'Reservation already confirmed',
        data: reservation,
        alreadyConfirmed: true
      });
    }

    // Step 4: Check if expired
    if (reservation.status === 'tentative') {
      const now = new Date();
      const expiresAt = new Date(reservation.expires_at);

      if (expiresAt < now) {
        // Mark as expired
        await client.query(
          `UPDATE reservations
           SET status = 'expired', updated_at = NOW()
           WHERE id = $1`,
          [id]
        );
        await client.query('COMMIT');

        const expiredMinutesAgo = Math.floor((now - expiresAt) / 60000);
        console.warn(`[VERIFY] Reservation ${id} expired ${expiredMinutesAgo} minutes ago`);

        return res.status(410).json({
          success: false,
          code: 'RESERVATION_EXPIRED',
          message: 'Reservation time no longer available. Please make a new reservation.',
          expiredAt: expiresAt.toISOString(),
          expiredMinutesAgo
        });
      }
    }

    // Step 5: Check for conflicts using the database function
    const buffer2 = await getReservationDurationMinutes(reservation.restaurant_id);
    const conflictCheck = await client.query(
      `SELECT * FROM check_reservation_conflicts($1, $2, $3, $4, $5)`,
      [id, reservation.table_id, reservation.reservation_date, reservation.reservation_time, buffer2]
    );

    if (conflictCheck.rows.length > 0) {
      const conflict = conflictCheck.rows[0];

      // Mark current reservation as expired
      await client.query(
        `UPDATE reservations
         SET status = 'expired', updated_at = NOW()
         WHERE id = $1`,
        [id]
      );
      await client.query('COMMIT');

      console.warn(`[VERIFY] Reservation ${id} conflicts with reservation ${conflict.conflicting_id}`);

      return res.status(409).json({
        success: false,
        code: 'RESERVATION_CONFLICT',
        message: 'Reservation time no longer available. Another customer booked this slot.',
        conflictingReservation: {
          id: conflict.conflicting_id,
          status: conflict.conflicting_status,
          time: conflict.conflicting_time
        }
      });
    }

    // Step 6: Extend expiration by 5 minutes (give user time to complete payment)
    const newExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await client.query(
      `UPDATE reservations
       SET expires_at = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [newExpiresAt, id]
    );

    await client.query('COMMIT');

    const verificationTime = Date.now() - startTime;
    console.log(`[VERIFY] Reservation ${id} verified successfully in ${verificationTime}ms`);

    res.json({
      success: true,
      message: 'Reservation is available. Proceed to payment.',
      data: {
        ...reservation,
        expires_at: newExpiresAt.toISOString()
      },
      verificationTime: `${verificationTime}ms`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[VERIFY] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify reservation',
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/reservations/:id/checkin
 * Customer marks "I'm Here" - triggers kitchen to start preparing pre-order
 * This allows customers to arrive early and have food prepared immediately
 */
router.post('/:id/checkin', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Update reservation to mark customer as arrived
    const updateResult = await client.query(
      `UPDATE reservations
       SET customer_arrived = true,
           arrival_time = NOW(),
           status = 'seated',
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    const reservation = updateResult.rows[0];

    // Mark table as occupied
    if (reservation.table_id) {
      await client.query(
        `UPDATE tables
         SET status = 'occupied', updated_at = NOW()
         WHERE id = $1`,
        [reservation.table_id]
      );
    }

    // If there's a pre-order, notify kitchen to start preparing
    if (reservation.has_pre_order) {
      // Find the pre-order
      const orderResult = await client.query(
        `SELECT * FROM orders
         WHERE reservation_id = $1 AND order_type = 'pre-order'`,
        [id]
      );

      if (orderResult.rows.length > 0) {
        const order = orderResult.rows[0];

        // Notify kitchen via Socket.IO
        const io = req.app.get('io');
        if (io) {
          io.to('kitchen').emit('customer-arrived', {
            reservationId: id,
            orderId: order.id,
            message: 'Customer arrived early - start preparing now',
            tableNumber: reservation.table_id
          });
        }

        // Mark order as kitchen notified
        await client.query(
          `UPDATE reservations
           SET kitchen_notified = true
           WHERE id = $1`,
          [id]
        );
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Checked in successfully',
      data: {
        reservation: updateResult.rows[0],
        kitchenNotified: reservation.has_pre_order
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error checking in:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check in',
      error: error.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;

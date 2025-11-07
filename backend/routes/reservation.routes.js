/**
 * Reservation Routes
 * API endpoints for managing table reservations
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { sendEmail } = require('../utils/email.service');
const { reservationCreated } = require('../utils/email.templates');
const { buildReservationICS } = require('../utils/ics');

/**
 * POST /api/reservations
 * Create a new reservation
 * Body: {
 *   restaurant_id, table_id, user_id, customer_name, customer_phone,
 *   customer_email, party_size, reservation_date, reservation_time,
 *   special_requests
 * }
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

      // Check if table is already reserved for this time
      const conflictCheck = await client.query(
        `SELECT * FROM reservations
         WHERE table_id = $1
           AND reservation_date = $2
           AND status NOT IN ('cancelled', 'completed', 'no-show')
           AND (
             -- Check for time overlap (assuming 90-minute duration)
             (reservation_time <= $3::time AND ($3::time - reservation_time) < interval '90 minutes')
             OR
             (reservation_time > $3::time AND (reservation_time - $3::time) < interval '90 minutes')
           )`,
        [table_id, reservation_date, reservation_time]
      );

      if (conflictCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: 'Table is already reserved for this time slot'
        });
      }
    }

    // Create reservation
    const insertQuery = `
      INSERT INTO reservations (
        restaurant_id, table_id, user_id, customer_name, customer_phone,
        customer_email, party_size, reservation_date, reservation_time,
        special_requests, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'confirmed')
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
      special_requests || null
    ]);

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
      message: 'Reservation created successfully',
      data: result.rows[0]
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

    const validStatuses = ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const result = await pool.query(
      'UPDATE reservations SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
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

    const result = await pool.query(
      'UPDATE reservations SET status = \'cancelled\', updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
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

module.exports = router;

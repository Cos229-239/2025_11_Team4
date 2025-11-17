const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /api/admin/settings?restaurant_id=:id (optional)
router.get('/', async (req, res) => {
  try {
    const restaurantId = req.query.restaurant_id ? parseInt(req.query.restaurant_id, 10) : null;
    if (restaurantId) {
      const r = await pool.query(
        `SELECT cancellation_window_hours, reservation_duration_minutes
         FROM reservation_settings WHERE restaurant_id = $1
         ORDER BY updated_at DESC LIMIT 1`,
        [restaurantId]
      );
      if (r.rowCount > 0) {
        return res.json({ success: true, data: { scope: 'restaurant', restaurant_id: restaurantId, ...r.rows[0] } });
      }
    }
    const g = await pool.query(
      `SELECT cancellation_window_hours, reservation_duration_minutes
       FROM reservation_settings WHERE restaurant_id IS NULL
       ORDER BY updated_at DESC LIMIT 1`
    );
    const data = g.rowCount > 0 ? g.rows[0] : { cancellation_window_hours: 12, reservation_duration_minutes: 90 };
    res.json({ success: true, data: { scope: 'global', restaurant_id: null, ...data } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to load settings', error: e.message });
  }
});

// PUT /api/admin/settings  { restaurant_id?: number, cancellation_window_hours, reservation_duration_minutes }
router.put('/', async (req, res) => {
  try {
    const { restaurant_id, cancellation_window_hours, reservation_duration_minutes } = req.body || {};
    if (cancellation_window_hours == null || reservation_duration_minutes == null) {
      return res.status(400).json({ success: false, message: 'Both cancellation_window_hours and reservation_duration_minutes are required' });
    }
    const rId = restaurant_id ? parseInt(restaurant_id, 10) : null;
    const q = rId
      ? `INSERT INTO reservation_settings (restaurant_id, cancellation_window_hours, reservation_duration_minutes, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING *`
      : `INSERT INTO reservation_settings (restaurant_id, cancellation_window_hours, reservation_duration_minutes, created_at, updated_at)
         VALUES (NULL, $1, $2, NOW(), NOW())
         RETURNING *`;
    const params = rId ? [rId, cancellation_window_hours, reservation_duration_minutes] : [cancellation_window_hours, reservation_duration_minutes];
    const ins = await pool.query(q, params);
    res.json({ success: true, message: 'Settings updated', data: ins.rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to update settings', error: e.message });
  }
});

module.exports = router;


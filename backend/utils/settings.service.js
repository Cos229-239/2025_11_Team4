const { pool } = require('../config/database');

const DEFAULT_DURATION = parseInt(process.env.RESERVATION_DURATION_MINUTES || '90', 10);
const DEFAULT_CANCEL = parseInt(process.env.CANCELLATION_WINDOW_HOURS || '12', 10);

// Simple in-memory cache with 60s TTL
const cache = {
  byRestaurant: new Map(), // key: restaurantId or 'global', value: { duration, cancel, ts }
  ttlMs: 60 * 1000,
};

async function loadSettingsFromDb(restaurantId) {
  try {
    if (restaurantId) {
      const res = await pool.query(
        `SELECT cancellation_window_hours, reservation_duration_minutes
         FROM reservation_settings
         WHERE restaurant_id = $1
         ORDER BY updated_at DESC
         LIMIT 1`,
        [restaurantId]
      );
      if (res.rows[0]) return res.rows[0];
    }
    // Fallback to global (restaurant_id IS NULL)
    const res = await pool.query(
      `SELECT cancellation_window_hours, reservation_duration_minutes
       FROM reservation_settings
       WHERE restaurant_id IS NULL
       ORDER BY updated_at DESC
       LIMIT 1`
    );
    return res.rows[0] || null;
  } catch {
    return null;
  }
}

async function getReservationDurationMinutes(restaurantId) {
  const key = restaurantId || 'global';
  const cached = cache.byRestaurant.get(key);
  const now = Date.now();
  if (cached && now - cached.ts < cache.ttlMs) return cached.duration;
  const db = await loadSettingsFromDb(restaurantId);
  const duration = db?.reservation_duration_minutes || DEFAULT_DURATION;
  const cancel = db?.cancellation_window_hours || DEFAULT_CANCEL;
  cache.byRestaurant.set(key, { duration, cancel, ts: now });
  return duration;
}

async function getCancellationWindowHours(restaurantId) {
  const key = restaurantId || 'global';
  const cached = cache.byRestaurant.get(key);
  const now = Date.now();
  if (cached && now - cached.ts < cache.ttlMs) return cached.cancel;
  const db = await loadSettingsFromDb(restaurantId);
  const duration = db?.reservation_duration_minutes || DEFAULT_DURATION;
  const cancel = db?.cancellation_window_hours || DEFAULT_CANCEL;
  cache.byRestaurant.set(key, { duration, cancel, ts: now });
  return cancel;
}

module.exports = {
  getReservationDurationMinutes,
  getCancellationWindowHours,
};


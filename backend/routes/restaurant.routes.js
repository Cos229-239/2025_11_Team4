/**
 * Restaurant Routes
 * API endpoints for managing restaurants in the multi-restaurant system
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 🔸 Import Crazy Otto's static data
const {
  crazyOttosRestaurant,
  crazyOttosMenuItems,
  crazyOttosMenuCategories,
} = require('../data/crazyOttosData');

/**
 * GET /api/restaurants
 * Get all active restaurants
 * Query params:
 *   - status: Filter by status (active, inactive, closed)
 *   - cuisine: Filter by cuisine type
 */
router.get('/', async (req, res) => {
  try {
    const { status = 'active', cuisine, lat, lng, radius_km } = req.query;

    // Build dynamic query with optional cuisine and proximity filter
    // If lat/lng provided, compute distance_km and optionally filter by radius
    let params = [status];
    let whereCuisine = '';
    if (cuisine) {
      whereCuisine = ` AND cuisine_type = $${params.length + 1}`;
      params.push(cuisine);
    }

    const hasGeo = lat && lng;
    let query;
    if (hasGeo) {
      params.push(parseFloat(lat), parseFloat(lng));
      const latIndex = params.length - 1;
      const lngIndex = params.length;
      // CTE to compute distance
      query = `
        WITH r AS (
          SELECT *,
            6371 * acos(
              cos(radians($${latIndex})) * cos(radians(latitude)) *
              cos(radians(longitude) - radians($${lngIndex})) +
              sin(radians($${latIndex})) * sin(radians(latitude))
            ) AS distance_km
          FROM restaurants
          WHERE status = $1${whereCuisine} AND latitude IS NOT NULL AND longitude IS NOT NULL
        )
        SELECT * FROM r`;

      if (radius_km) {
        params.push(parseFloat(radius_km));
        query += ` WHERE distance_km <= $${params.length}`;
      }

      query += ' ORDER BY distance_km ASC, rating DESC, name ASC';
    } else {
      query = `SELECT * FROM restaurants WHERE status = $1${whereCuisine} ORDER BY rating DESC, name ASC`;
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch restaurants',
      error: error.message
    });
  }
});

/**
 * GET /api/restaurants/:id
 * Get detailed information about a specific restaurant
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 🔸 Special case: Crazy Otto's (id = 0) from static data
    if (id === '0') {
      return res.json({
        success: true,
        data: crazyOttosRestaurant,
      });
    }

    const result = await pool.query(
      'SELECT * FROM restaurants WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch restaurant',
      error: error.message
    });
  }
});

/**
 * GET /api/restaurants/:id/menu
 * Get all menu items for a specific restaurant
 * Query params:
 *   - category: Filter by category
 *   - available: Filter by availability (true/false)
 */
router.get('/:id/menu', async (req, res) => {
  try {
    const { id } = req.params;
    const { category, available } = req.query;

    // 🔸 Special case: Crazy Otto's static menu
    if (id === '0') {
      let items = [...crazyOttosMenuItems];

      if (category) {
        items = items.filter(item => item.category === category);
      }

      if (available !== undefined) {
        const isAvailable = available === 'true';
        items = items.filter(item => item.available === isAvailable);
      }

      return res.json({
        success: true,
        data: items,
        count: items.length,
      });
    }

    // 🔹 Default DB-backed behavior for all other restaurants
    let query = 'SELECT * FROM menu_items WHERE restaurant_id = $1';
    const params = [id];

    if (category) {
      query += ' AND category = $' + (params.length + 1);
      params.push(category);
    }

    if (available !== undefined) {
      query += ' AND available = $' + (params.length + 1);
      params.push(available === 'true');
    }

    query += ' ORDER BY category, name';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching restaurant menu:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch restaurant menu',
      error: error.message
    });
  }
});

/**
 * GET /api/restaurants/:id/menu/categories
 * Get unique menu categories for a specific restaurant
 */
router.get('/:id/menu/categories', async (req, res) => {
  try {
    const { id } = req.params;

    // 🔸 Special case: Crazy Otto's static categories
    if (id === '0') {
      return res.json({
        success: true,
        data: crazyOttosMenuCategories,
      });
    }

    const result = await pool.query(
      'SELECT DISTINCT category FROM menu_items WHERE restaurant_id = $1 AND available = true ORDER BY category',
      [id]
    );

    const categories = result.rows.map(row => row.category);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching menu categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu categories',
      error: error.message
    });
  }
});

/**
 * GET /api/restaurants/:id/tables
 * Get all tables for a specific restaurant
 * Query params:
 *   - status: Filter by status (available, reserved, occupied)
 *   - capacity: Minimum capacity
 */
router.get('/:id/tables', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, capacity } = req.query;

    let query = 'SELECT * FROM tables WHERE restaurant_id = $1';
    const params = [id];

    if (status) {
      query += ' AND status = $' + (params.length + 1);
      params.push(status);
    }

    if (capacity) {
      query += ' AND capacity >= $' + (params.length + 1);
      params.push(parseInt(capacity));
    }

    query += ' ORDER BY table_number';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching restaurant tables:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch restaurant tables',
      error: error.message
    });
  }
});

/**
 * GET /api/restaurants/:id/availability
 * Check table availability for a specific date and time
 * Query params:
 *   - date: Reservation date (YYYY-MM-DD)
 *   - time: Reservation time (HH:MM)
 *   - partySize: Number of guests
 *   - duration: Expected duration in minutes (default: 90)
 */
router.get('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time, partySize } = req.query;
    const { getReservationDurationMinutes } = require('../utils/settings.service');
    const BUFFER_MINUTES = await getReservationDurationMinutes(parseInt(id, 10));

    if (!date || !time || !partySize) {
      return res.status(400).json({
        success: false,
        message: 'Date, time, and party size are required'
      });
    }

    // Get all tables for the restaurant that can accommodate the party size
    const tablesQuery = `
      SELECT * FROM tables
      WHERE restaurant_id = $1
        AND capacity >= $2
        AND status != 'out-of-service'
      ORDER BY capacity ASC
    `;
    const tablesResult = await pool.query(tablesQuery, [id, parseInt(partySize)]);

    if (tablesResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          available: false,
          message: 'No tables available for the requested party size',
          tables: []
        }
      });
    }

    // Check which tables are already reserved for the requested time slot
    const reservedTablesQuery = `
      SELECT table_id
      FROM reservations
      WHERE restaurant_id = $1
        AND reservation_date = $2
        AND status NOT IN ('cancelled', 'completed', 'no-show')
        AND (
          -- Check if the requested time overlaps with existing reservations
          (reservation_time <= $3::time AND ($3::time - reservation_time) < (($4 || ' minutes')::interval))
          OR
          (reservation_time > $3::time AND (reservation_time - $3::time) < (($4 || ' minutes')::interval))
        )
    `;
    const reservedTablesResult = await pool.query(reservedTablesQuery, [id, date, time, BUFFER_MINUTES]);
    const reservedTableIds = reservedTablesResult.rows.map(row => row.table_id);

    // Filter out reserved tables
    const availableTables = tablesResult.rows.filter(
      table => !reservedTableIds.includes(table.id)
    );

    res.json({
      success: true,
      data: {
        available: availableTables.length > 0,
        tables: availableTables,
        count: availableTables.length
      }
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check availability',
      error: error.message
    });
  }
});

/**
 * GET /api/restaurants/:id/stats
 * Get statistics for a restaurant
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    // Get restaurant info
    const restaurantResult = await pool.query(
      'SELECT name, rating FROM restaurants WHERE id = $1',
      [id]
    );

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // Get menu item count
    const menuCountResult = await pool.query(
      'SELECT COUNT(*) as menu_count FROM menu_items WHERE restaurant_id = $1 AND available = true',
      [id]
    );

    // Get table count
    const tableCountResult = await pool.query(
      'SELECT COUNT(*) as table_count, SUM(capacity) as total_capacity FROM tables WHERE restaurant_id = $1',
      [id]
    );

    // Get today's reservation count
    const today = new Date().toISOString().split('T')[0];
    const todayReservationsResult = await pool.query(
      'SELECT COUNT(*) as today_reservations FROM reservations WHERE restaurant_id = $1 AND reservation_date = $2 AND status NOT IN (\'cancelled\', \'no-show\')',
      [id, today]
    );

    // Get total completed orders
    const completedOrdersResult = await pool.query(
      'SELECT COUNT(*) as completed_orders FROM orders WHERE restaurant_id = $1 AND status = \'completed\'',
      [id]
    );

    res.json({
      success: true,
      data: {
        restaurant: restaurantResult.rows[0],
        menuItemCount: parseInt(menuCountResult.rows[0].menu_count),
        tableCount: parseInt(tableCountResult.rows[0].table_count),
        totalCapacity: parseInt(tableCountResult.rows[0].total_capacity || 0),
        todayReservations: parseInt(todayReservationsResult.rows[0].today_reservations),
        completedOrders: parseInt(completedOrdersResult.rows[0].completed_orders)
      }
    });
  } catch (error) {
    console.error('Error fetching restaurant stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch restaurant stats',
      error: error.message
    });
  }
});

module.exports = router;

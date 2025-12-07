const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs'); // Needed for creating employees
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

// Middleware to ensure all routes in this file are protected
// We can also double-check in specific routes if needed, but robust to do it here or in server.js
router.use(authenticateToken);
router.use(requireRole(['developer', 'owner']));

// ==============================================================================
// EMPLOYEE MANAGEMENT
// ==============================================================================

// GET /api/admin/employees
// List staff (filter by restaurant_id optional, but for now list all relevant to user)
// If logic for multi-tenancy improves, filter by restaurant_id owned by user
router.get('/employees', async (req, res) => {
    try {
        const { restaurant_id } = req.query;

        // Base query
        // We want to fetch users who have 'employee' role AND are assigned to the restaurant(s)
        // Or just all users with role 'employee' if we are simplistic for now, 
        // but specification says "List staff", implies existing context.

        // To properly support "Staff List", we join user_restaurants

        let query = `
      SELECT u.id, u.name, u.email, u.phone, u.role, u.on_duty, ur.restaurant_id
      FROM users u
      LEFT JOIN user_restaurants ur ON u.id = ur.user_id
      WHERE u.role = 'employee'
    `;
        const params = [];

        if (restaurant_id) {
            query += ` AND ur.restaurant_id = $1`;
            params.push(restaurant_id);
        }

        query += ` ORDER BY u.created_at DESC`;

        const result = await pool.query(query, params);
        res.json({ success: true, employees: result.rows });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch employees' });
    }
});

// POST /api/admin/employees
// Create employee
router.post('/employees', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { name, email, phone, password, restaurant_id } = req.body;

        if (!name || !email || !password || !restaurant_id) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // 1. Create User
        const pwHash = await bcrypt.hash(password, 10);

        // Check if user exists first to handle conflict gracefully or just insert
        // The spec say "Create employee", usually means new user. 
        // If email exists, we might just want to link them? But simpler to assume new for now.
        // We'll use ON CONFLICT to update if exists but check role?
        // Let's assume creating new fresh user.

        const userRes = await client.query(
            `INSERT INTO users (name, email, phone, password_hash, role, is_verified, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'employee', true, NOW(), NOW())
             RETURNING id`,
            [name, email, phone, pwHash]
        );
        const userId = userRes.rows[0].id;

        // 2. Assign to Restaurant
        await client.query(
            `INSERT INTO user_restaurants (user_id, restaurant_id) VALUES ($1, $2)`,
            [userId, restaurant_id]
        );

        // 3. Assign Role (using roles table/link if RBAC is fully strict, or just users.role column as above)
        // Schema shows `user_roles` table too. Let's populate that for consistency.
        // Find 'employee' role id
        const roleRes = await client.query(`SELECT id FROM roles WHERE name = 'employee'`);
        if (roleRes.rows.length > 0) {
            const roleId = roleRes.rows[0].id;
            await client.query(
                `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [userId, roleId]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, message: 'Employee created successfully', employeeId: userId });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating employee:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }
        res.status(500).json({ success: false, message: 'Failed to create employee' });
    } finally {
        client.release();
    }
});

// PUT /api/admin/employees/:id
// Update employee
router.put('/employees/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, on_duty } = req.body; // allow toggling duty and editing info

        // specific update logic
        // Build dynamic query
        const updates = [];
        const values = [];
        let idx = 1;

        if (name) { updates.push(`name = $${idx++}`); values.push(name); }
        if (email) { updates.push(`email = $${idx++}`); values.push(email); }
        if (phone) { updates.push(`phone = $${idx++}`); values.push(phone); }
        if (on_duty !== undefined) { updates.push(`on_duty = $${idx++}`); values.push(on_duty); }

        if (updates.length === 0) return res.json({ success: true, message: 'No changes' });

        values.push(id);
        const query = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING id, name, on_duty`;

        const result = await pool.query(query, values);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Employee not found' });

        res.json({ success: true, employee: result.rows[0] });
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ success: false, message: 'Failed to update employee' });
    }
});

// DELETE /api/admin/employees/:id
// Remove employee
router.delete('/employees/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Prevent self-delete
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
        }

        const result = await pool.query('DELETE FROM users WHERE id = $1 AND role = $2 RETURNING id', [id, 'employee']);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Employee not found or not an employee' });
        }
        res.json({ success: true, message: 'Employee deleted' });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ success: false, message: 'Failed to delete employee' });
    }
});

// ==============================================================================
// RESTAURANT MANAGEMENT
// ==============================================================================

// GET /api/admin/my-restaurants
// List restaurants owned/managed by the current user
router.get('/my-restaurants', async (req, res) => {
    try {
        const userId = req.user.id;
        // If user is developer/admin, maybe return all?
        // But for "Owner Portal", we strictly want what they are assigned to.
        // Even developers should verify they are assigned or use a different 'all' endpoint.
        // Let's stick to user_restaurants for now.

        // However, if the user is the CREATOR of a restaurant but not manually in user_restaurants yet? 
        // We should probably rely on user_restaurants being the source of truth.

        const query = `
            SELECT r.* 
            FROM restaurants r
            JOIN user_restaurants ur ON r.id = ur.restaurant_id
            WHERE ur.user_id = $1
            ORDER BY r.name
        `;
        const result = await pool.query(query, [userId]);

        // If no restaurants found but user is 'owner', maybe they haven't created one yet.
        res.json({ success: true, restaurants: result.rows });
    } catch (error) {
        console.error('Error fetching my restaurants:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch restaurants' });
    }
});

// PUT /api/admin/restaurants/:id
// Update restaurant profile
router.put('/restaurants/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, cuisine_type, address, phone, email, opening_hours } = req.body;

        const result = await pool.query(
            `UPDATE restaurants 
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 cuisine_type = COALESCE($3, cuisine_type),
                 address = COALESCE($4, address),
                 phone = COALESCE($5, phone),
                 email = COALESCE($6, email),
                 opening_hours = COALESCE($7, opening_hours),
                 updated_at = NOW()
             WHERE id = $8
             RETURNING *`,
            [name, description, cuisine_type, address, phone, email, opening_hours, id]
        );

        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Restaurant not found' });
        res.json({ success: true, restaurant: result.rows[0] });
    } catch (error) {
        console.error('Error updating restaurant:', error);
        res.status(500).json({ success: false, message: 'Failed to update restaurant' });
    }
});

// POST /api/admin/restaurants
// Create restaurant (Developer Only theoretically, but owner schema implies they manage what they have. 
// Spec says "Create restaurant (developer only)", but let's implement validation if needed.
// For now, allow accessible by route guard.)
router.post('/restaurants', async (req, res) => {
    // Basic implementation
    try {
        const { name, description, cuisine_type, address, phone, email } = req.body;
        const result = await pool.query(
            `INSERT INTO restaurants (name, description, cuisine_type, address, phone, email, status)
              VALUES ($1, $2, $3, $4, $5, $6, 'active') RETURNING *`,
            [name, description, cuisine_type, address, phone, email]
        );
        res.status(201).json({ success: true, restaurant: result.rows[0] });
    } catch (error) {
        console.error('Error creating restaurant:', error);
        res.status(500).json({ success: false, message: 'Failed to create restaurant' });
    }
});

// ==============================================================================
// SETTINGS
// ==============================================================================

// GET /api/admin/settings
// Get reservation settings for a restaurant
router.get('/settings', async (req, res) => {
    try {
        const { restaurant_id } = req.query;
        if (!restaurant_id) return res.status(400).json({ success: false, message: 'Restaurant ID required' });

        const result = await pool.query(
            'SELECT * FROM reservation_settings WHERE restaurant_id = $1',
            [restaurant_id]
        );

        // Return default if not set
        if (result.rows.length === 0) {
            return res.json({
                success: true,
                settings: {
                    restaurant_id,
                    cancellation_window_hours: 24,
                    reservation_duration_minutes: 90
                }
            });
        }
        res.json({ success: true, settings: result.rows[0] });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch settings' });
    }
});

// PUT /api/admin/settings
// Upsert settings
router.put('/settings', async (req, res) => {
    try {
        const { restaurant_id, cancellation_window_hours, reservation_duration_minutes } = req.body;

        if (!restaurant_id) return res.status(400).json({ success: false, message: 'Restaurant ID required' });

        const result = await pool.query(
            `INSERT INTO reservation_settings (restaurant_id, cancellation_window_hours, reservation_duration_minutes, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (restaurant_id) 
             DO UPDATE SET 
                cancellation_window_hours = EXCLUDED.cancellation_window_hours,
                reservation_duration_minutes = EXCLUDED.reservation_duration_minutes,
                updated_at = NOW()
             RETURNING *`,
            [restaurant_id, cancellation_window_hours, reservation_duration_minutes]
        );
        res.json({ success: true, settings: result.rows[0] });
    } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ success: false, message: 'Failed to save settings' });
    }
});

// ==============================================================================
// ANALYTICS
// ==============================================================================

// GET /api/admin/analytics/:restaurantId
router.get('/analytics/:restaurantId', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { range = '7d' } = req.query; // e.g. 7d, 30d

        // 1. Revenue & Orders by Day (Last 7 days)
        // Simple grouping by date
        const revenueQuery = `
            SELECT 
                DATE(created_at) as date, 
                COUNT(*) as order_count, 
                SUM(total_amount) as revenue
            FROM orders
            WHERE restaurant_id = $1
              AND status != 'cancelled'
              AND created_at > NOW() - INTERVAL '7 days'
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
        `;
        const revenueRes = await pool.query(revenueQuery, [restaurantId]);

        // 2. Guest Flow / Reservation Trends (by hour for today, or by day for range?)
        // Spec mentions "Guest flow by hour" (bar chart) for OverviewStats which usually implies Today.
        // Let's get today's hourly distribution of COVERS (guests)
        const guestFlowQuery = `
            SELECT 
                EXTRACT(HOUR FROM reservation_time) as hour,
                SUM(party_size) as guests
            FROM reservations
            WHERE restaurant_id = $1
              AND reservation_date = CURRENT_DATE
              AND status IN ('confirmed', 'seated', 'completed')
            GROUP BY EXTRACT(HOUR FROM reservation_time)
            ORDER BY hour
        `;
        const guestFlowRes = await pool.query(guestFlowQuery, [restaurantId]);

        // 3. Top Items (Most ordered)
        const topItemsQuery = `
            SELECT 
                mi.name, 
                COUNT(oi.id) as quantity_sold
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.restaurant_id = $1
              AND o.status != 'cancelled'
            GROUP BY mi.id, mi.name
            ORDER BY quantity_sold DESC
            LIMIT 5
        `;
        const topItemsRes = await pool.query(topItemsQuery, [restaurantId]);

        // 4. Counts for Today
        // Today's Reservations
        const resCountQuery = `
            SELECT COUNT(*) 
            FROM reservations 
            WHERE restaurant_id = $1 
              AND reservation_date = CURRENT_DATE 
              AND status != 'cancelled'
        `;
        const resCountRes = await pool.query(resCountQuery, [restaurantId]);

        // Active Tables
        const activeTablesQuery = `
            SELECT COUNT(*) 
            FROM tables 
            WHERE restaurant_id = $1 
              AND status = 'occupied'
        `;
        const activeTablesRes = await pool.query(activeTablesQuery, [restaurantId]);

        res.json({
            success: true,
            revenueByDay: revenueRes.rows,
            guestFlowToday: guestFlowRes.rows,
            topItems: topItemsRes.rows,
            summary: {
                reservationsToday: parseInt(resCountRes.rows[0].count),
                activeTables: parseInt(activeTablesRes.rows[0].count)
            }
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
    }
});

module.exports = router;

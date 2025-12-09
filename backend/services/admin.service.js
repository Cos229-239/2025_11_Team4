const { pool } = require('../config/database');
const logger = require('../utils/logger');

class AdminService {

    // ========================
    // Employees
    // ========================

    async listEmployees(restaurant_id) {
        let query = `
      SELECT u.id, u.name, u.email, u.phone, u.role, u.on_duty,
             u.position, u.hourly_rate, u.hire_date, u.emergency_contact,
             ur.restaurant_id
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
        return result.rows;
    }

    async updateEmployee(id, data) {
        const updates = [];
        const values = [];
        let idx = 1;

        // Extended allowed fields to include new employee properties
        const allowedFields = ['name', 'email', 'phone', 'on_duty', 'position', 'hourly_rate', 'hire_date', 'emergency_contact'];
        allowedFields.forEach(field => {
            const val = data[field];
            if (val !== undefined) {
                // Allow null values for optional fields
                if (val === null || val === '') {
                    updates.push(`${field} = NULL`);
                } else {
                    updates.push(`${field} = $${idx++}`);
                    values.push(val);
                }
            }
        });

        if (updates.length === 0) return null; // No changes

        values.push(id);
        const query = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    async deleteEmployee(id, requestor_id) {
        // Prevent self-delete
        if (parseInt(id) === requestor_id) {
            throw new Error('Cannot delete yourself');
        }

        const result = await pool.query('DELETE FROM users WHERE id = $1 AND role = $2 RETURNING id', [id, 'employee']);
        return result.rows.length > 0;
    }

    // ========================
    // Restaurants
    // ========================

    async getMyRestaurants(user_id, user_role) {
        // Super Admin access for developers
        if (user_role === 'developer') {
            const result = await pool.query('SELECT * FROM restaurants ORDER BY name');
            return result.rows;
        }

        const query = `
            SELECT r.* 
            FROM restaurants r
            JOIN user_restaurants ur ON r.id = ur.restaurant_id
            WHERE ur.user_id = $1
            ORDER BY r.name
        `;
        const result = await pool.query(query, [user_id]);
        return result.rows;
    }

    async updateRestaurant(id, data) {
        const {
            name, description, cuisine_type, address, phone, email,
            opening_hours, status, latitude, longitude, logo_url, cover_image_url,
            // New fields
            service_types, accepts_reservations, accepts_online_orders,
            delivery_radius_km, minimum_order_amount, delivery_fee,
            estimated_prep_time_minutes, tax_rate, service_charge_percent,
            website_url, social_media
        } = data;

        const result = await pool.query(
            `UPDATE restaurants
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 cuisine_type = COALESCE($3, cuisine_type),
                 address = COALESCE($4, address),
                 phone = COALESCE($5, phone),
                 email = COALESCE($6, email),
                 opening_hours = COALESCE($7, opening_hours),
                 status = COALESCE($8, status),
                 latitude = COALESCE($9, latitude),
                 longitude = COALESCE($10, longitude),
                 logo_url = COALESCE($11, logo_url),
                 cover_image_url = COALESCE($12, cover_image_url),
                 service_types = COALESCE($13, service_types),
                 accepts_reservations = COALESCE($14, accepts_reservations),
                 accepts_online_orders = COALESCE($15, accepts_online_orders),
                 delivery_radius_km = COALESCE($16, delivery_radius_km),
                 minimum_order_amount = COALESCE($17, minimum_order_amount),
                 delivery_fee = COALESCE($18, delivery_fee),
                 estimated_prep_time_minutes = COALESCE($19, estimated_prep_time_minutes),
                 tax_rate = COALESCE($20, tax_rate),
                 service_charge_percent = COALESCE($21, service_charge_percent),
                 website_url = COALESCE($22, website_url),
                 social_media = COALESCE($23, social_media),
                 updated_at = NOW()
             WHERE id = $24
             RETURNING *`,
            [
                name, description, cuisine_type, address, phone, email,
                opening_hours, status, latitude, longitude, logo_url, cover_image_url,
                service_types, accepts_reservations, accepts_online_orders,
                delivery_radius_km, minimum_order_amount, delivery_fee,
                estimated_prep_time_minutes, tax_rate, service_charge_percent,
                website_url, social_media, id
            ]
        );

        return result.rows[0];
    }

    async createRestaurant(data) {
        const { name, description, cuisine_type, address, phone, email } = data;
        const result = await pool.query(
            `INSERT INTO restaurants (name, description, cuisine_type, address, phone, email, status)
              VALUES ($1, $2, $3, $4, $5, $6, 'active') RETURNING *`,
            [name, description, cuisine_type, address, phone, email]
        );
        return result.rows[0];
    }

    async deleteRestaurant(id) {
        const result = await pool.query('DELETE FROM restaurants WHERE id = $1 RETURNING id', [id]);
        return result.rows.length > 0;
    }

    // ========================
    // Settings
    // ========================

    async getSettings(restaurant_id) {
        const result = await pool.query(
            'SELECT * FROM reservation_settings WHERE restaurant_id = $1',
            [restaurant_id]
        );

        if (result.rows.length === 0) {
            return {
                restaurant_id,
                cancellation_window_hours: 24,
                reservation_duration_minutes: 90,
                is_default: true
            };
        }
        return result.rows[0];
    }

    async updateSettings(data) {
        const { restaurant_id, cancellation_window_hours, reservation_duration_minutes } = data;

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
        return result.rows[0];
    }

    // ========================
    // Analytics
    // ========================

    async getAnalytics(restaurantId, range = '7d') {
        // 1. Revenue & Orders
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

        // 2. Guest Flow
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

        // 3. Top Items
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

        // 4. Counts
        const resCountQuery = `
            SELECT COUNT(*) 
            FROM reservations 
            WHERE restaurant_id = $1 
              AND reservation_date = CURRENT_DATE 
              AND status != 'cancelled'
        `;
        const resCountRes = await pool.query(resCountQuery, [restaurantId]);

        const activeTablesQuery = `
            SELECT COUNT(*) 
            FROM tables 
            WHERE restaurant_id = $1 
              AND status = 'occupied'
        `;
        const activeTablesRes = await pool.query(activeTablesQuery, [restaurantId]);

        return {
            revenueByDay: revenueRes.rows,
            guestFlowToday: guestFlowRes.rows,
            topItems: topItemsRes.rows,
            summary: {
                reservationsToday: parseInt(resCountRes.rows[0].count),
                activeTables: parseInt(activeTablesRes.rows[0].count)
            }
        };
    }
}

module.exports = new AdminService();

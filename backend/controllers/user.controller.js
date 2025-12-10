const UserDTO = require('../dtos/user.dto');
const UserModel = require('../models/user.model');
const { pool } = require('../config/database');

exports.getProfile = async (req, res) => {
    try {
        const user = await UserModel.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        res.json({ success: true, data: new UserDTO(user) });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch profile', error: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const user = await UserModel.update(req.params.id, req.body);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        res.json({ success: true, data: new UserDTO(user) });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update profile', error: error.message });
    }
};

exports.getFavorites = async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT f.id, f.name, o.id as order_id, o.total_amount, o.created_at, r.name as restaurant_name
      FROM favorite_orders f
      JOIN orders o ON f.order_id = o.id
      JOIN restaurants r ON o.restaurant_id = r.id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC
    `, [req.params.id]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch favorites', error: error.message });
    }
};

exports.addFavorite = async (req, res) => {
    try {
        const { order_id, name } = req.body;
        const result = await pool.query(
            'INSERT INTO favorite_orders (user_id, order_id, name) VALUES ($1, $2, $3) RETURNING *',
            [req.params.id, order_id, name]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to add favorite', error: error.message });
    }
};

exports.removeFavorite = async (req, res) => {
    try {
        await pool.query('DELETE FROM favorite_orders WHERE id = $1 AND user_id = $2', [req.params.favId, req.params.id]);
        res.json({ success: true, message: 'Favorite removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to remove favorite', error: error.message });
    }
};

exports.getPaymentMethods = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM payment_methods WHERE user_id = $1', [req.params.id]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch payment methods', error: error.message });
    }
};

exports.addPaymentMethod = async (req, res) => {
    try {
        // Mock implementation - in real app, would exchange token with Stripe
        const { stripe_token, last4, brand } = req.body;
        const result = await pool.query(
            'INSERT INTO payment_methods (user_id, stripe_payment_method_id, last4, brand) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.params.id, `pm_${Math.random().toString(36).substr(2, 9)}`, last4 || '4242', brand || 'Visa']
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to add payment method', error: error.message });
    }
};

exports.deletePaymentMethod = async (req, res) => {
    try {
        await pool.query('DELETE FROM payment_methods WHERE id = $1 AND user_id = $2', [req.params.methodId, req.params.id]);
        res.json({ success: true, message: 'Payment method removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to remove payment method', error: error.message });
    }
};

exports.getEmployees = async (req, res) => {
    try {
        const employees = await UserModel.findAllEmployees();
        res.json({ success: true, data: employees.map(u => new UserDTO(u)) });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch employees', error: error.message });
    }
};

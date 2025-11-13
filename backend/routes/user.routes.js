/**
 * User (Profile) Routes
 */
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /api/users?email=... (fetch by unique email)
router.get('/', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'email query parameter is required' });
    }
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user', error: error.message });
  }
});

// Create user (profile)
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, role = 'customer' } = req.body;
    const result = await pool.query(
      `INSERT INTO users (name, phone, email, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
      [name || null, phone || null, email || null, role]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create user', error: error.message });
  }
});

// Get user by id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user', error: error.message });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, email, role } = req.body;
    const fields = [];
    const params = [];
    let i = 1;
    if (name !== undefined) { fields.push(`name = $${i++}`); params.push(name); }
    if (phone !== undefined) { fields.push(`phone = $${i++}`); params.push(phone); }
    if (email !== undefined) { fields.push(`email = $${i++}`); params.push(email); }
    if (role !== undefined) { fields.push(`role = $${i++}`); params.push(role); }
    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });
    params.push(req.params.id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to update user', error: error.message });
  }
});

module.exports = router;

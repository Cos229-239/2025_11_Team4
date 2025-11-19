const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
// Kitchen PIN hash (bcrypt hash of '1234') - In production, store this in DB or env
const KITCHEN_PIN_HASH = '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa'; 

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    const pwHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, phone, email, password_hash, role, created_at, updated_at)
       VALUES ($1,$2,$3,$4,'customer',NOW(),NOW())
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, phone=EXCLUDED.phone, updated_at=NOW()
       RETURNING id, name, phone, email, role`,
      [name || null, phone || null, email, pwHash]
    );
    const user = result.rows[0];
    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    res.status(201).json({ success: true, token, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to sign up', error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0 || !result.rows[0].password_hash) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    const { password_hash, ...safeUser } = user;
    res.json({ success: true, token, user: { id: safeUser.id, name: safeUser.name, phone: safeUser.phone, email: safeUser.email, role: safeUser.role } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to login', error: error.message });
  }
});

// POST /api/auth/kitchen-login
router.post('/kitchen-login', async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, message: 'PIN is required' });
    }

    // Compare provided PIN with stored hash
    // In a real app, you might query a 'kitchen_settings' table for the hash
    const match = await bcrypt.compare(pin, KITCHEN_PIN_HASH);

    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid PIN' });
    }

    // Create a specific token for kitchen access
    const token = jwt.sign({ role: 'kitchen' }, JWT_SECRET, { expiresIn: '8h' });

    res.json({ success: true, token, message: 'Kitchen access granted' });
  } catch (error) {
    console.error('Kitchen login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
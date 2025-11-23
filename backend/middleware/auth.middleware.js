const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// 1. Authenticate Token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid token.' });
    req.user = user; // payload should contain { sub, email, role }
    next();
  });
};

// 2. Require Role (RBAC)
// Usage: router.get('/admin', authenticateToken, requireRole(['developer', 'owner']), controller)
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user || !req.user.sub) return res.status(401).json({ success: false, message: 'Unauthorized' });

    try {
      // Check roles in DB (more secure than relying solely on JWT payload which might be stale)
      const result = await pool.query(`
        SELECT r.name 
        FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = $1
      `, [req.user.sub]);

      const userRoles = result.rows.map(row => row.name);
      
      // Also check legacy role column for compatibility if it exists in your JWT
      if (req.user.role) userRoles.push(req.user.role);

      const hasRole = userRoles.some(role => allowedRoles.includes(role));

      if (!hasRole) {
        return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
      }

      // Attach roles to request for next middleware
      req.userRoles = userRoles;
      next();
    } catch (error) {
      console.error('RBAC Error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
};

// 3. Scope Restaurant Access
// Usage: router.get('/restaurant/:id/orders', authenticateToken, requireRole(['owner', 'employee']), authorizeRestaurant, controller)
const authorizeRestaurant = async (req, res, next) => {
  const userId = req.user.sub;
  // Restaurant ID might come from params (:id) or body or query
  const restaurantId = req.params.id || req.params.restaurantId || req.body.restaurant_id || req.query.restaurant_id;

  // If no restaurant context is needed/provided, skip
  if (!restaurantId) return next(); 

  // Developers bypass scoping (Super Admin)
  if (req.userRoles && req.userRoles.includes('developer')) return next();

  try {
    const result = await pool.query(`
      SELECT 1 FROM user_restaurants 
      WHERE user_id = $1 AND restaurant_id = $2
    `, [userId, restaurantId]);

    if (result.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Access denied. You are not assigned to this restaurant.' });
    }

    next();
  } catch (error) {
    console.error('Scope Error:', error);
    res.status(500).json({ success: false, message: 'Authorization check failed' });
  }
};

module.exports = { authenticateToken, requireRole, authorizeRestaurant };

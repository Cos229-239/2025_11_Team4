const express = require('express');
const router = express.Router();

const { authenticateToken, requireRole } = require('../../middleware/auth.middleware');
const { authLimiter, orderLimiter, adminLimiter } = require('../../middleware/rateLimiter');

// Import Route Handlers
const authRoutes = require('../auth.routes');
const reservationRoutes = require('../reservation.routes');
const adminRoutes = require('../admin.routes');
const orderRoutes = require('../order.routes');
const menuRoutes = require('../menu.routes');
const tableRoutes = require('../table.routes');
const restaurantRoutes = require('../restaurant.routes');
const userRoutes = require('../user.routes');
const paymentRoutes = require('../payment.routes');
const settingsRoutes = require('../settings.routes');

// Mount Routes
router.use('/auth', authLimiter, authRoutes);
router.use('/reservations', reservationRoutes);
router.use('/admin', adminLimiter, adminRoutes);
router.use('/orders', orderLimiter, orderRoutes);
router.use('/menu', menuRoutes);
router.use('/tables', tableRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/users', userRoutes);
router.use('/payments', paymentRoutes);

// Protected Nested Admin Routes (Settings)
// In server.js this was mounted as /api/admin/settings
// Here we can mount it under /admin/settings if adminRoutes doesn't handle it, 
// OR keep it separate if it's distinct. 
// Server.js had: app.use('/api/v1/admin/settings', authenticateToken, requireRole(['developer', 'owner']), settingsRoutes);
// We'll preserve that structure.
router.use('/admin/settings', authenticateToken, requireRole(['developer', 'owner']), settingsRoutes);

module.exports = router;

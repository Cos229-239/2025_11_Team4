const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { updateRestaurantSchema } = require('../utils/validationSchemas');
const adminController = require('../controllers/admin.controller');

// Middleware to ensure all routes in this file are protected
router.use(authenticateToken);
router.use(requireRole(['developer', 'owner']));

// ==============================================================================
// EMPLOYEE MANAGEMENT
// ==============================================================================

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative functions
 */

/**
 * @swagger
 * /admin/employees:
 *   get:
 *     summary: List all employees
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of employees
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
// GET /api/admin/employees
router.get('/employees', adminController.listEmployees);

// PUT /api/admin/employees/:id
router.put('/employees/:id', adminController.updateEmployee);

// DELETE /api/admin/employees/:id
router.delete('/employees/:id', adminController.deleteEmployee);

// ==============================================================================
// RESTAURANT MANAGEMENT
// ==============================================================================

// GET /api/admin/my-restaurants
router.get('/my-restaurants', adminController.getMyRestaurants);

// PUT /api/admin/restaurants/:id
router.put('/restaurants/:id', validate(updateRestaurantSchema), adminController.updateRestaurant);

// POST /api/admin/restaurants
router.post('/restaurants', adminController.createRestaurant);

// DELETE /api/admin/restaurants/:id
router.delete('/restaurants/:id', adminController.deleteRestaurant);

// ==============================================================================
// SETTINGS
// ==============================================================================

// GET /api/admin/settings
router.get('/settings', adminController.getSettings);

// PUT /api/admin/settings
router.put('/settings', adminController.updateSettings);

// ==============================================================================
// ANALYTICS
// ==============================================================================

// GET /api/admin/analytics/:restaurantId
router.get('/analytics/:restaurantId', adminController.getAnalytics);

module.exports = router;

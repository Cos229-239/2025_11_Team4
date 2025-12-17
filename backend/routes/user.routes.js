/**
 * User (Profile) Routes
 */
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticateToken, requireRole, requireSelfOrRole } = require('../middleware/auth.middleware');

// All user endpoints require authentication
router.use(authenticateToken);

// Employees
router.get('/employees', requireRole(['developer', 'owner', 'employee']), userController.getEmployees);

// Profile
router.get('/:id', requireSelfOrRole(['developer', 'owner', 'employee']), userController.getProfile);
router.put('/:id', requireSelfOrRole(['developer', 'owner', 'employee']), userController.updateProfile);

// Favorites
router.get('/:id/favorites', requireSelfOrRole(['developer', 'owner', 'employee']), userController.getFavorites);
router.post('/:id/favorites', requireSelfOrRole(['developer', 'owner', 'employee']), userController.addFavorite);
router.delete('/:id/favorites/:favId', requireSelfOrRole(['developer', 'owner', 'employee']), userController.removeFavorite);

// Payment Methods
router.get('/:id/payment-methods', requireSelfOrRole(['developer', 'owner', 'employee']), userController.getPaymentMethods);
router.post('/:id/payment-methods', requireSelfOrRole(['developer', 'owner', 'employee']), userController.addPaymentMethod);
router.delete('/:id/payment-methods/:methodId', requireSelfOrRole(['developer', 'owner', 'employee']), userController.deletePaymentMethod);

module.exports = router;

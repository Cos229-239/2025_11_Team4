/**
 * User (Profile) Routes
 */
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

// Employees
router.get('/employees', userController.getEmployees);

// Profile
router.get('/:id', userController.getProfile);
router.put('/:id', userController.updateProfile);

// Favorites
router.get('/:id/favorites', userController.getFavorites);
router.post('/:id/favorites', userController.addFavorite);
router.delete('/:id/favorites/:favId', userController.removeFavorite);

// Payment Methods
router.get('/:id/payment-methods', userController.getPaymentMethods);
router.post('/:id/payment-methods', userController.addPaymentMethod);
router.delete('/:id/payment-methods/:methodId', userController.deletePaymentMethod);

module.exports = router;

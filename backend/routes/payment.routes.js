const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

// Create payment intent
router.post('/create-intent', paymentController.createPaymentIntent);

// Confirm payment and finalize order/reservation
router.post('/confirm', paymentController.confirmPayment);

// Refund payment
router.post('/refund', authenticateToken, requireRole(['developer', 'owner']), paymentController.refundPayment);

// Get payment intent details
router.get('/:id', authenticateToken, requireRole(['developer', 'owner']), paymentController.getPaymentIntent);

module.exports = router;

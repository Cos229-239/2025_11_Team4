const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');

// GET /api/orders/active - Get active orders (must be before /:id route)
router.get('/active', orderController.getActiveOrders);

// GET /api/orders/by-number/:orderNumber - Lookup order by human-facing number
// This must be defined before the generic "/:id" route.
router.get('/by-number/:orderNumber', orderController.getOrderByNumber);

// GET /api/orders/table/:tableId - Get orders by table
router.get('/table/:tableId', orderController.getOrdersByTable);

// GET /api/orders/user/:userId - Get orders by user
router.get('/user/:userId', orderController.getUserOrders);

// GET /api/orders/payment-intent/:paymentIntentId - Get order by payment intent
router.get('/payment-intent/:paymentIntentId', orderController.getOrderByPaymentIntent);

// POST /api/orders - Create new order
router.post('/', orderController.createOrder);

// GET /api/orders - Get all orders
router.get('/', orderController.getAllOrders);

// GET /api/orders/:id - Get single order by ID
router.get('/:id', orderController.getOrderById);

// PATCH /api/orders/:id/status - Update order status
router.patch('/:id/status', orderController.updateOrderStatus);

module.exports = router;

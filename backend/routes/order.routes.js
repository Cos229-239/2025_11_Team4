const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');

// GET /api/orders/active - Get active orders (must be before /:id route)
router.get('/active', orderController.getActiveOrders);

// GET /api/orders/table/:tableId - Get orders by table
router.get('/table/:tableId', orderController.getOrdersByTable);

// POST /api/orders - Create new order
router.post('/', orderController.createOrder);

// GET /api/orders - Get all orders
router.get('/', orderController.getAllOrders);

// GET /api/orders/:id - Get single order by ID
router.get('/:id', orderController.getOrderById);

// PATCH /api/orders/:id/status - Update order status
router.patch('/:id/status', orderController.updateOrderStatus);

module.exports = router;

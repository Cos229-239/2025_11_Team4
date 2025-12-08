const orderService = require('../services/order.service');
const logger = require('../utils/logger');
const OrderDTO = require('../dtos/order.dto');

class OrderController {

  async createOrder(req, res) {
    try {
      // Determine user_id from auth if not provided
      const user_id = req.user ? req.user.id : req.body.user_id;
      const orderData = { ...req.body, user_id };

      const order = await orderService.createOrder(orderData);

      // Socket Events
      const io = req.app.get('io');
      if (io) { // Only checking if io exists, emit logic is mostly fire-and-forget
        if (order.order_type === 'dine-in' || order.order_type === 'walk-in' || order.order_type === 'takeout') {
          // For sockets, we might send the raw order or DTO. 
          // Usually raw for internal logic, but DTO is safer for frontend listeners.
          // Let's send DTO to be consistent.
          const dto = new OrderDTO(order);
          io.to('kitchen').emit('new-order', dto);
          io.to('admin').emit('new-order', dto);
        } else if (order.order_type === 'pre-order') {
          io.to('admin').emit('new-pre-order', new OrderDTO(order));
        }
      }

      // Async Email Receipt
      if (order.payment_status === 'completed' && order.user_id) {
        orderService.sendReceiptEmail(order, order.items, null).catch(err => {
          logger.error('Background email send failed', { error: err.message });
        });
      }

      res.status(201).json({ success: true, data: new OrderDTO(order), message: 'Order created successfully' });

    } catch (error) {
      // Idempotency check
      if (error.message === 'Order already exists for this payment') {
        try {
          const existing = await orderService.getOrderByPaymentIntent(req.body.payment_intent_id);
          return res.status(200).json({ success: true, data: new OrderDTO(existing), message: 'Order already exists for this payment' });
        } catch (innerError) {
          logger.error('Error fetching existing order after idempotency collision', innerError);
        }
      }

      logger.error('Error creating order', { error: error.message });

      if (error.statusCode) return res.status(error.statusCode).json({ success: false, error: error.message });
      if (error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('must be')) {
        return res.status(400).json({ success: false, error: error.message });
      }

      res.status(500).json({ success: false, error: 'Failed to create order', message: error.message });
    }
  }

  async getAllOrders(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const restaurantId = req.query.restaurant_id ? parseInt(req.query.restaurant_id) : null;

      const { orders, total } = await orderService.getAllOrders(page, limit, restaurantId);

      res.json({
        success: true,
        data: orders.map(o => new OrderDTO(o)),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching orders', error);
      res.status(500).json({ success: false, error: 'Failed to fetch orders' });
    }
  }

  async getOrderById(req, res) {
    try {
      const { id } = req.params;
      const order = await orderService.getOrderById(id);
      if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
      res.json({ success: true, data: new OrderDTO(order) });
    } catch (error) {
      logger.error('Error fetching order', error);
      res.status(500).json({ success: false, error: 'Failed to fetch order' });
    }
  }

  async getActiveOrders(req, res) {
    try {
      const orders = await orderService.getActiveOrders();
      res.json({ success: true, data: orders.map(o => new OrderDTO(o)), count: orders.length });
    } catch (error) {
      logger.error('Error fetching active orders', error);
      res.status(500).json({ success: false, error: 'Failed to fetch active orders' });
    }
  }

  async getOrdersByTable(req, res) {
    try {
      const { tableId } = req.params;
      const orders = await orderService.getOrdersByTable(tableId);
      res.json({ success: true, data: orders.map(o => new OrderDTO(o)), count: orders.length });
    } catch (error) {
      logger.error('Error fetching orders by table', error);
      res.status(500).json({ success: false, error: 'Failed to fetch orders' });
    }
  }

  async getUserOrders(req, res) {
    try {
      const { userId } = req.params;
      // Security check
      if (req.user && req.user.id !== parseInt(userId) && req.user.role === 'customer') {
        return res.status(403).json({ message: 'Unauthorized to view these orders' });
      }
      const orders = await orderService.getOrdersByUser(userId);
      res.json(orders.map(o => new OrderDTO(o)));
    } catch (error) {
      logger.error('Error fetching user orders', error);
      res.status(500).json({ message: 'Error fetching user orders', error: error.message });
    }
  }

  async getOrderByNumber(req, res) {
    try {
      const { orderNumber } = req.params;
      const normalized = String(orderNumber).replace(/[^\d]/g, '');
      if (!normalized || isNaN(normalized)) return res.status(400).json({ success: false, error: 'Invalid order number' });

      const order = await orderService.getOrderById(parseInt(normalized, 10));
      if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
      res.json({ success: true, data: new OrderDTO(order) });
    } catch (error) {
      logger.error('Error fetching order by number', error);
      res.status(500).json({ success: false, error: 'Failed to fetch order' });
    }
  }

  async getOrderByPaymentIntent(req, res) {
    try {
      const { paymentIntentId } = req.params;
      const order = await orderService.getOrderByPaymentIntent(paymentIntentId);
      if (!order) return res.status(404).json({ success: false, error: 'Order not found for this payment' });
      res.json({ success: true, data: new OrderDTO(order) });
    } catch (error) {
      logger.error('Error fetching order by payment intent', error);
      res.status(500).json({ success: false, error: 'Failed to fetch order' });
    }
  }

  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const updatedOrder = await orderService.updateOrderStatus(id, status);
      const dto = new OrderDTO(updatedOrder);

      // Socket Events
      const io = req.app.get('io');
      if (io) {
        io.to(`table-${updatedOrder.table_id}`).emit('order-updated', dto);
        io.to('kitchen').emit('order-updated', dto);
        io.to('admin').emit('order-updated', dto);

        const statusPayload = {
          orderNumber: dto.order_number,
          status: dto.status,
          estimatedTime: dto.estimated_completion
        };
        io.to(`table-${updatedOrder.table_id}`).emit('order-status-update', statusPayload);
      }

      res.json({ success: true, data: dto, message: 'Order status updated successfully' });

    } catch (error) {
      logger.error('Error updating order status', error);
      if (error.message.includes('Order not found')) return res.status(404).json({ success: false, error: 'Order not found' });
      if (error.message.includes('Cannot transition')) return res.status(400).json({ success: false, error: error.message });
      res.status(500).json({ success: false, error: 'Failed to update order status' });
    }
  }
}

module.exports = new OrderController();

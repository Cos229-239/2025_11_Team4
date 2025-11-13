const orderModel = require('../models/order.model');
const db = require('../config/database');

// Allowed status transitions
const STATUS_TRANSITIONS = {
  'pending': ['preparing', 'cancelled'],
  'preparing': ['ready', 'cancelled'],
  'ready': ['completed', 'cancelled'],
  'completed': [],
  'cancelled': []
};

// Create new order
const createOrder = async (req, res) => {
  try {
    const { table_id, items, customer_notes } = req.body;

    // Validation
    if (!table_id) {
      return res.status(400).json({
        success: false,
        error: 'Table ID is required'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required and must contain at least one item'
      });
    }

    // Validate each item
    for (const item of items) {
      if (!item.menu_item_id) {
        return res.status(400).json({
          success: false,
          error: 'Each item must have a menu_item_id'
        });
      }

      if (!item.quantity || item.quantity < 1) {
        return res.status(400).json({
          success: false,
          error: 'Each item must have a valid quantity (minimum 1)'
        });
      }
    }

    // Optional: detect imminent reservations for this table (guard)
    // Guard dine-in orders: block if an upcoming reservation exists within the next 90 minutes
    const guardQuery = `
      SELECT r.*
      FROM reservations r
      WHERE r.table_id = $1
        AND r.status IN ('pending','confirmed')
        AND (r.reservation_date::timestamp + r.reservation_time)
              BETWEEN NOW() AND (NOW() + interval '90 minutes')
      ORDER BY r.reservation_date, r.reservation_time ASC
      LIMIT 1
    `;
    try {
      const guardRes = await db.query(guardQuery, [table_id]);
      if (guardRes.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Upcoming reservation detected for this table within 90 minutes',
          reservation: guardRes.rows[0]
        });
      }
    } catch (e) {
      // Continue on guard error, do not block ordering
      console.warn('Reservation guard check failed:', e.message);
    }

    // Create order
    const order = await orderModel.createOrder({
      table_id,
      items,
      customer_notes
    });

    // Emit socket event for new order
    const io = req.app.get('io');
    if (io) {
      io.to('kitchen').emit('new-order', order);
      io.to('admin').emit('new-order', order);
    }

    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('Error creating order:', error);

    // Check if it's a validation error from the model
    if (error.message.includes('not found') || error.message.includes('not available')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create order',
      message: error.message
    });
  }
};

// Get all orders
const getAllOrders = async (req, res) => {
  try {
    const orders = await orderModel.getAllOrders();

    res.json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders',
      message: error.message
    });
  }
};

// Get single order by ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID'
      });
    }

    const order = await orderModel.getOrderById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order',
      message: error.message
    });
  }
};

// Get active orders (for kitchen)
const getActiveOrders = async (req, res) => {
  try {
    const orders = await orderModel.getActiveOrders();

    res.json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    console.error('Error fetching active orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active orders',
      message: error.message
    });
  }
};

// Get orders by table ID
const getOrdersByTable = async (req, res) => {
  try {
    const { tableId } = req.params;

    if (!tableId || isNaN(tableId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid table ID'
      });
    }

    const orders = await orderModel.getOrdersByTable(tableId);

    res.json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    console.error('Error fetching orders by table:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders by table',
      message: error.message
    });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Get current order to check current status
    const currentOrder = await orderModel.getOrderById(id);

    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Validate status transition
    const allowedTransitions = STATUS_TRANSITIONS[currentOrder.status];
    if (!allowedTransitions.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot transition from '${currentOrder.status}' to '${status}'. Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`
      });
    }

    // Update status
    const updatedOrder = await orderModel.updateOrderStatus(id, status);

    // Emit socket event for status update
    const io = req.app.get('io');
    if (io) {
      io.to(`table-${updatedOrder.table_id}`).emit('order-updated', updatedOrder);
      io.to('kitchen').emit('order-updated', updatedOrder);
      io.to('admin').emit('order-updated', updatedOrder);
    }

    res.json({
      success: true,
      data: updatedOrder,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order status',
      message: error.message
    });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  getActiveOrders,
  getOrdersByTable,
  updateOrderStatus
};

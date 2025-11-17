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
    const {
      table_id,
      items,
      customer_notes,
      order_type = 'dine-in',
      reservation_id,
      scheduled_for,
      payment_status,
      payment_method,
      payment_intent_id,
      payment_amount
    } = req.body;

    // Validate order_type
    const validOrderTypes = ['dine-in', 'pre-order', 'walk-in'];
    if (!validOrderTypes.includes(order_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid order_type. Must be one of: ${validOrderTypes.join(', ')}`
      });
    }

    // Validate payment is completed before creating order
    if (payment_status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Payment must be completed before creating order'
      });
    }

    // Validate payment details are provided
    if (!payment_intent_id || !payment_amount) {
      return res.status(400).json({
        success: false,
        error: 'Payment intent ID and payment amount are required'
      });
    }

    // Idempotency guard: avoid creating duplicate orders for the same payment
    if (payment_intent_id) {
      try {
        const existing = await db.query(
          'SELECT id FROM orders WHERE payment_intent_id = $1 LIMIT 1',
          [payment_intent_id]
        );

        if (existing.rows.length > 0) {
          const existingOrder = await orderModel.getOrderById(existing.rows[0].id);
          return res.status(200).json({
            success: true,
            data: existingOrder,
            message: 'Order already exists for this payment'
          });
        }
      } catch (e) {
        console.warn('Order idempotency check failed:', e.message);
        // Continue with normal creation on idempotency check failure
      }
    }

    // Validation based on order type
    if (order_type === 'dine-in' || order_type === 'walk-in') {
      if (!table_id) {
        return res.status(400).json({
          success: false,
          error: 'Table ID is required for dine-in and walk-in orders'
        });
      }
    }

    if (order_type === 'pre-order') {
      if (!reservation_id) {
        return res.status(400).json({
          success: false,
          error: 'Reservation ID is required for pre-orders'
        });
      }

      // Verify reservation exists and is valid
      const reservationCheck = await db.query(
        'SELECT * FROM reservations WHERE id = $1',
        [reservation_id]
      );

      if (reservationCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Reservation not found'
        });
      }

      const reservation = reservationCheck.rows[0];

      if (reservation.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          error: 'Cannot create pre-order for cancelled reservation'
        });
      }
    }

    // Validate items
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
    // Only for dine-in/walk-in orders
    if ((order_type === 'dine-in' || order_type === 'walk-in') && table_id) {
      // Load restaurant_id for the table and use per-restaurant setting
      const rRow = await db.query('SELECT restaurant_id FROM tables WHERE id = $1', [table_id]);
      const restaurantId = rRow.rows[0]?.restaurant_id || null;
      const { getReservationDurationMinutes } = require('../utils/settings.service');
      const BUFFER_MINUTES = await getReservationDurationMinutes(restaurantId);
      const guardQuery = `
        SELECT r.*
        FROM reservations r
        WHERE r.table_id = $1
          AND r.status IN ('pending','confirmed')
          AND (r.reservation_date::timestamp + r.reservation_time)
                BETWEEN NOW() AND (NOW() + ($2 || ' minutes')::interval)
        ORDER BY r.reservation_date, r.reservation_time ASC
        LIMIT 1
      `;
      try {
        const guardRes = await db.query(guardQuery, [table_id, BUFFER_MINUTES]);
        if (guardRes.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: `Upcoming reservation detected for this table within ${BUFFER_MINUTES} minutes`,
            reservation: guardRes.rows[0]
          });
        }
      } catch (e) {
        // Continue on guard error, do not block ordering
        console.warn('Reservation guard check failed:', e.message);
      }
    }

    // Create order
    const order = await orderModel.createOrder({
      table_id,
      items,
      customer_notes,
      order_type,
      reservation_id,
      scheduled_for,
      payment_status,
      payment_method,
      payment_intent_id,
      payment_amount
    });

    // CRITICAL: Confirm reservation after successful payment (per flowchart)
    if (order_type === 'pre-order' && reservation_id && payment_status === 'completed') {
      try {
        console.log(`[ORDER] Confirming reservation ${reservation_id} after successful payment`);

        const confirmResult = await db.query(
          `UPDATE reservations
           SET status = 'confirmed',
               confirmed_at = NOW(),
               payment_id = $1,
               has_pre_order = true,
               updated_at = NOW()
           WHERE id = $2 AND status = 'tentative'
           RETURNING *`,
          [payment_intent_id, reservation_id]
        );

        if (confirmResult.rows.length === 0) {
          console.warn(`[ORDER] Failed to confirm reservation ${reservation_id} - may already be confirmed or expired`);
        } else {
          console.log(`[ORDER] Reservation ${reservation_id} confirmed successfully`);
        }
      } catch (err) {
        console.error(`[ORDER] Error confirming reservation ${reservation_id}:`, err.message);
        // Don't fail the order creation if reservation confirmation fails
        // Order is already created and paid, just log the error
      }
    }

    // Only emit socket event to kitchen for dine-in orders with completed payment
    // Pre-orders will be sent to kitchen when customer checks in or at scheduled time
    const io = req.app.get('io');
    if (io) {
      if (order_type === 'dine-in' || order_type === 'walk-in') {
        // Immediate orders go to kitchen right away
        io.to('kitchen').emit('new-order', order);
        io.to('admin').emit('new-order', order);
      } else if (order_type === 'pre-order') {
        // Pre-orders only notify admin, not kitchen (kitchen gets notified on check-in or scheduled time)
        io.to('admin').emit('new-pre-order', order);
      }
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

// Get single order by "order number" (human-facing)
// For now, order number maps directly to the numeric order ID,
// but this keeps the API flexible if we later introduce a separate
// order_number column or formatted values (e.g. "#123").
const getOrderByNumber = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        error: 'Order number is required'
      });
    }

    // Normalize: strip non-digits so we can accept inputs like "#15"
    const normalized = String(orderNumber).replace(/[^\d]/g, '');

    if (!normalized) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order number'
      });
    }

    const id = parseInt(normalized, 10);

    if (!id || Number.isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order number'
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
    console.error('Error fetching order by number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order',
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

      const statusPayload = {
        orderNumber: updatedOrder.order_number || String(updatedOrder.id),
        status: updatedOrder.status,
        estimatedTime: updatedOrder.estimated_completion || null
      };
      io.to(`table-${updatedOrder.table_id}`).emit('order-status-update', statusPayload);
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
  updateOrderStatus,
  getOrderByNumber
};

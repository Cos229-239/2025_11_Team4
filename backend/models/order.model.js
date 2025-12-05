const db = require('../config/database');

// Create new order with items (using transaction)
const createOrder = async (orderData) => {
  const {
    table_id = null,
    restaurant_id = null,
    user_id = null,
    items,
    customer_notes,
    order_type = 'dine-in',
    reservation_id = null,
    scheduled_for = null,
    payment_status = 'pending',
    payment_method = null,
    payment_intent_id = null,
    payment_amount = null,
    tip_amount = 0
  } = orderData;

  // Get a client from the pool for transaction
  const client = await db.pool.connect();

  try {
    // Start transaction
    await client.query('BEGIN');

    // Calculate total amount
    let totalAmount = 0;

    // First, validate all menu items exist and are available
    for (const item of items) {
      const menuItemResult = await client.query(
        'SELECT id, name, price, available FROM menu_items WHERE id = $1',
        [item.menu_item_id]
      );

      if (menuItemResult.rows.length === 0) {
        throw new Error(`Menu item with ID ${item.menu_item_id} not found`);
      }

      if (!menuItemResult.rows[0].available) {
        throw new Error(`Menu item "${menuItemResult.rows[0].name}" is not available`);
      }
    }

    // Insert order with new payment and order type fields
    const orderResult = await client.query(
      `INSERT INTO orders (
        table_id,
        restaurant_id,
        user_id,
        total_amount,
        customer_notes,
        status,
        order_type,
        reservation_id,
        scheduled_for,
        payment_status,
        payment_method,
        payment_intent_id,
        payment_amount,
        tip_amount,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING *`,
      [
        table_id,
        restaurant_id,
        user_id,
        0, // Will update total_amount after calculating
        customer_notes || '',
        'pending',
        order_type,
        reservation_id,
        scheduled_for,
        payment_status,
        payment_method,
        payment_intent_id,
        payment_amount,
        tip_amount
      ]
    );

    const order = orderResult.rows[0];

    // Insert order items
    const orderItems = [];
    for (const item of items) {
      const menuItemResult = await client.query(
        'SELECT id, name, price FROM menu_items WHERE id = $1',
        [item.menu_item_id]
      );

      const menuItem = menuItemResult.rows[0];
      const subtotal = parseFloat(menuItem.price) * item.quantity;
      totalAmount += subtotal;

      const orderItemResult = await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, menu_item_name, menu_item_price, quantity, special_instructions, subtotal, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING *`,
        [
          order.id,
          menuItem.id,
          menuItem.name,
          menuItem.price,
          item.quantity,
          item.special_instructions || '',
          subtotal
        ]
      );

      orderItems.push(orderItemResult.rows[0]);
    }

    // Update order with calculated total
    await client.query(
      'UPDATE orders SET total_amount = $1 WHERE id = $2',
      [totalAmount, order.id]
    );

    order.total_amount = totalAmount;

    // If this is a pre-order linked to a reservation, update the reservation
    if (order_type === 'pre-order' && reservation_id) {
      await client.query(
        'UPDATE reservations SET has_pre_order = true WHERE id = $1',
        [reservation_id]
      );
    }

    // Commit transaction
    await client.query('COMMIT');

    // Return complete order with items
    return {
      ...order,
      items: orderItems
    };

  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // Release client back to pool
    client.release();
  }
};

// Get all orders with their items
const getAllOrders = async () => {
  try {
    // Get all orders
    const ordersResult = await db.query(
      'SELECT * FROM orders ORDER BY created_at DESC'
    );

    // For each order, get its items
    const ordersWithItems = await Promise.all(
      ordersResult.rows.map(async (order) => {
        const itemsResult = await db.query(
          'SELECT * FROM order_items WHERE order_id = $1 ORDER BY id',
          [order.id]
        );

        return {
          ...order,
          items: itemsResult.rows
        };
      })
    );

    return ordersWithItems;
  } catch (error) {
    throw error;
  }
};

// Get single order by ID with items
const getOrderById = async (id) => {
  try {
    const orderResult = await db.query(
      `SELECT 
         o.*,
         t.table_number,
         t.restaurant_id AS table_restaurant_id,
         r.name AS restaurant_name
       FROM orders o
       LEFT JOIN tables t ON o.table_id = t.id
       LEFT JOIN restaurants r ON t.restaurant_id = r.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return null;
    }

    const order = orderResult.rows[0];

    // Get order items
    const itemsResult = await db.query(
      'SELECT * FROM order_items WHERE order_id = $1 ORDER BY id',
      [id]
    );

    return {
      ...order,
      items: itemsResult.rows
    };
  } catch (error) {
    throw error;
  }
};

// Get active orders (not completed or cancelled)
const getActiveOrders = async () => {
  try {
    const ordersResult = await db.query(
      `SELECT * FROM orders
       WHERE status IN ('pending', 'preparing', 'ready')
       ORDER BY created_at ASC`
    );

    // For each order, get its items
    const ordersWithItems = await Promise.all(
      ordersResult.rows.map(async (order) => {
        const itemsResult = await db.query(
          'SELECT * FROM order_items WHERE order_id = $1 ORDER BY id',
          [order.id]
        );

        return {
          ...order,
          items: itemsResult.rows
        };
      })
    );

    return ordersWithItems;
  } catch (error) {
    throw error;
  }
};

// Get orders by table ID
const getOrdersByTable = async (tableId) => {
  try {
    const ordersResult = await db.query(
      'SELECT * FROM orders WHERE table_id = $1 ORDER BY created_at DESC',
      [tableId]
    );

    // For each order, get its items
    const ordersWithItems = await Promise.all(
      ordersResult.rows.map(async (order) => {
        const itemsResult = await db.query(
          'SELECT * FROM order_items WHERE order_id = $1 ORDER BY id',
          [order.id]
        );

        return {
          ...order,
          items: itemsResult.rows
        };
      })
    );

    return ordersWithItems;
  } catch (error) {
    throw error;
  }
};

// Update order status
const updateOrderStatus = async (id, status) => {
  try {
    const result = await db.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const order = result.rows[0];

    // Get order items
    const itemsResult = await db.query(
      'SELECT * FROM order_items WHERE order_id = $1 ORDER BY id',
      [id]
    );

    return {
      ...order,
      items: itemsResult.rows
    };
  } catch (error) {
    throw error;
  }
};

// Check if order exists
const orderExists = async (id) => {
  try {
    const result = await db.query(
      'SELECT EXISTS(SELECT 1 FROM orders WHERE id = $1)',
      [id]
    );
    return result.rows[0].exists;
  } catch (error) {
    throw error;
  }
};

// Get orders by user ID
const getOrdersByUser = async (userId) => {
  try {
    const ordersResult = await db.query(
      `SELECT 
         o.*,
         r.name AS restaurant_name,
         r.image_url AS restaurant_image,
         r.timezone AS restaurant_timezone
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
      [userId]
    );

    // For each order, get its items
    const ordersWithItems = await Promise.all(
      ordersResult.rows.map(async (order) => {
        const itemsResult = await db.query(
          'SELECT * FROM order_items WHERE order_id = $1 ORDER BY id',
          [order.id]
        );

        return {
          ...order,
          items: itemsResult.rows
        };
      })
    );

    return ordersWithItems;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  getActiveOrders,
  getOrdersByTable,
  updateOrderStatus,
  orderExists,
  getOrdersByUser
};

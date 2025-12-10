/**
 * Table Model
 * Database operations for managing restaurant tables
 */

const db = require('../config/database');

/**
 * Get all tables
 * @returns {Promise<Array>} Array of table objects
 */
const getAllTables = async () => {
  try {
    const query = `
      SELECT
        id,
        restaurant_id,
        table_number,
        capacity,
        min_capacity,
        status,
        qr_code,
        section,
        shape,
        notes,
        is_accessible,
        created_at,
        updated_at
      FROM tables
      ORDER BY table_number ASC
    `;

    const result = await db.pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error in getAllTables:', error);
    throw error;
  }
};

/**
 * Get table by ID
 * @param {number} id - Table ID
 * @returns {Promise<Object|null>} Table object or null if not found
 */
const getTableById = async (id) => {
  try {
    const query = `
      SELECT
        id,
        restaurant_id,
        table_number,
        capacity,
        min_capacity,
        status,
        qr_code,
        section,
        shape,
        notes,
        is_accessible,
        created_at,
        updated_at
      FROM tables
      WHERE id = $1
    `;

    const result = await db.pool.query(query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error in getTableById:', error);
    throw error;
  }
};

/**
 * Get table by table number
 * @param {number} tableNumber - Table number
 * @returns {Promise<Object|null>} Table object or null if not found
 */
const getTableByNumber = async (tableNumber, restaurantId = null) => {
  try {
    let query = `
      SELECT
        id,
        restaurant_id,
        table_number,
        capacity,
        min_capacity,
        status,
        qr_code,
        section,
        shape,
        notes,
        is_accessible,
        created_at,
        updated_at
      FROM tables
      WHERE table_number = $1
    `;
    const params = [tableNumber];

    if (restaurantId) {
      query += ` AND restaurant_id = $2`;
      params.push(restaurantId);
    }

    const result = await db.pool.query(query, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error in getTableByNumber:', error);
    throw error;
  }
};

/**
 * Create new table
 * @param {Object} tableData - Table data
 * @param {number} tableData.table_number - Table number
 * @param {number} tableData.capacity - Table capacity
 * @param {number} tableData.min_capacity - Minimum capacity
 * @param {string} tableData.status - Table status (default: 'available')
 * @param {string} tableData.qr_code - QR code data URL
 * @param {string} tableData.section - Table section
 * @param {string} tableData.shape - Table shape
 * @param {string} tableData.notes - Notes about the table
 * @param {boolean} tableData.is_accessible - Accessibility flag
 * @returns {Promise<Object>} Created table object
 */
const createTable = async (tableData) => {
  try {
    const {
      table_number, capacity, min_capacity, status, qr_code, restaurant_id,
      section, shape, notes, is_accessible
    } = tableData;

    const query = `
      INSERT INTO tables (
        restaurant_id, table_number, capacity, min_capacity, status, qr_code,
        section, shape, notes, is_accessible, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING
        id,
        restaurant_id,
        table_number,
        capacity,
        min_capacity,
        status,
        qr_code,
        section,
        shape,
        notes,
        is_accessible,
        created_at,
        updated_at
    `;

    const values = [
      restaurant_id,
      table_number,
      capacity || 4,
      min_capacity || 1,
      status || 'available',
      qr_code || null,
      section || null,
      shape || 'square',
      notes || null,
      is_accessible !== undefined ? is_accessible : false,
    ];

    const result = await db.pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error in createTable:', error);
    throw error;
  }
};

/**
 * Update table
 * @param {number} id - Table ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated table object or null if not found
 */
const updateTable = async (id, updates) => {
  try {
    const allowedFields = [
      'table_number', 'capacity', 'min_capacity', 'status', 'qr_code',
      'section', 'shape', 'notes', 'is_accessible'
    ];
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic update query
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Add updated_at timestamp
    fields.push(`updated_at = NOW()`);

    // Add id to values
    values.push(id);

    const query = `
      UPDATE tables
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING
        id,
        restaurant_id,
        table_number,
        capacity,
        min_capacity,
        status,
        qr_code,
        section,
        shape,
        notes,
        is_accessible,
        created_at,
        updated_at
    `;

    const result = await db.pool.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error in updateTable:', error);
    throw error;
  }
};

/**
 * Delete table
 * @param {number} id - Table ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
const deleteTable = async (id) => {
  try {
    // Check if table has any active orders
    const orderCheckQuery = `
      SELECT COUNT(*) as count
      FROM orders
      WHERE table_id = $1
        AND status IN ('pending', 'preparing', 'ready')
    `;

    const orderCheck = await db.pool.query(orderCheckQuery, [id]);
    const activeOrderCount = parseInt(orderCheck.rows[0].count);

    if (activeOrderCount > 0) {
      throw new Error(
        `Cannot delete table: ${activeOrderCount} active order(s) exist for this table`
      );
    }

    const query = 'DELETE FROM tables WHERE id = $1 RETURNING id';
    const result = await db.pool.query(query, [id]);

    return result.rows.length > 0;
  } catch (error) {
    console.error('Error in deleteTable:', error);
    throw error;
  }
};

/**
 * Update table status
 * @param {number} id - Table ID
 * @param {string} status - New status ('available', 'occupied', 'reserved', 'unavailable')
 * @returns {Promise<Object|null>} Updated table object or null if not found
 */
const updateTableStatus = async (id, status) => {
  try {
    const validStatuses = ['available', 'occupied', 'reserved', 'unavailable'];

    if (!validStatuses.includes(status)) {
      throw new Error(
        `Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`
      );
    }

    const query = `
      UPDATE tables
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING
        id,
        restaurant_id,
        table_number,
        capacity,
        min_capacity,
        status,
        qr_code,
        section,
        shape,
        notes,
        is_accessible,
        created_at,
        updated_at
    `;

    const result = await db.pool.query(query, [status, id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error in updateTableStatus:', error);
    throw error;
  }
};

/**
 * Get tables by status
 * @param {string} status - Table status
 * @returns {Promise<Array>} Array of table objects
 */
const getTablesByStatus = async (status, restaurantId = null) => {
  try {
    let query = `
      SELECT
        id,
        restaurant_id,
        table_number,
        capacity,
        min_capacity,
        status,
        qr_code,
        section,
        shape,
        notes,
        is_accessible,
        created_at,
        updated_at
      FROM tables
      WHERE status = $1
    `;
    const params = [status];

    if (restaurantId) {
      query += ` AND restaurant_id = $2`;
      params.push(restaurantId);
    }

    query += ` ORDER BY table_number ASC`;

    const result = await db.pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error in getTablesByStatus:', error);
    throw error;
  }
};

/**
 * Count tables
 * @returns {Promise<number>} Total number of tables
 */
const countTables = async () => {
  try {
    const query = 'SELECT COUNT(*) as count FROM tables';
    const result = await db.pool.query(query);
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Error in countTables:', error);
    throw error;
  }
};

module.exports = {
  getAllTables,
  getTableById,
  getTableByNumber,
  createTable,
  updateTable,
  deleteTable,
  updateTableStatus,
  getTablesByStatus,
  countTables,
};

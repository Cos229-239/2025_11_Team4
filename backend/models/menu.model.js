const db = require('../config/database');

// Get all menu items with optional category filter (uses menu_items.category)
const getAllMenuItems = async (category = null, restaurantId = null) => {
  try {
    let query = `
      SELECT mi.*,
        COALESCE(mi.dietary_tags, '{}') as dietary_tags,
        COALESCE(mi.allergens, '{}') as allergens
      FROM menu_items mi
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (restaurantId) {
      query += ` AND mi.restaurant_id = $${paramCount}`;
      params.push(restaurantId);
      paramCount++;
    }

    if (category) {
      query += ` AND mi.category = $${paramCount}`;
      params.push(category);
    }

    query += ' ORDER BY mi.sort_order, mi.category, mi.name';

    const result = await db.query(query, params);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

// Get single menu item by ID
const getMenuItemById = async (id) => {
  try {
    const result = await db.query(
      `SELECT mi.* FROM menu_items mi WHERE mi.id = $1`,
      [id]
    );
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

// Get all unique categories from menu_items.category
const getAllCategories = async () => {
  try {
    const result = await db.query(
      'SELECT DISTINCT category FROM menu_items WHERE category IS NOT NULL ORDER BY category'
    );
    return result.rows.map(row => row.category);
  } catch (error) {
    throw error;
  }
};

// Create new menu item with enhanced fields
const createMenuItem = async (menuItem) => {
  try {
    const {
      name, description, price, category, image_url, available, restaurant_id,
      dietary_tags, allergens, calories, prep_time_minutes, spice_level,
      is_featured, is_new, sort_order
    } = menuItem;

    const result = await db.query(
      `INSERT INTO menu_items (
        restaurant_id, name, description, price, category, image_url, available,
        dietary_tags, allergens, calories, prep_time_minutes, spice_level,
        is_featured, is_new, sort_order, created_at, updated_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
       RETURNING *`,
      [
        restaurant_id || null,
        name,
        description,
        price,
        category,
        image_url || null,
        available !== undefined ? available : true,
        dietary_tags || [],
        allergens || [],
        calories || null,
        prep_time_minutes || null,
        spice_level || null,
        is_featured || false,
        is_new || false,
        sort_order || 0
      ]
    );

    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

// Update menu item
const updateMenuItem = async (id, updates) => {
  try {
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic UPDATE query based on provided fields
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined && key !== 'id') {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    // Add updated_at timestamp
    fields.push(`updated_at = NOW()`);

    // Add id as the last parameter
    values.push(id);

    const query = `
      UPDATE menu_items
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

// Delete menu item
const deleteMenuItem = async (id) => {
  try {
    const result = await db.query(
      'DELETE FROM menu_items WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

// Check if menu item exists
const menuItemExists = async (id) => {
  try {
    const result = await db.query(
      'SELECT EXISTS(SELECT 1 FROM menu_items WHERE id = $1)',
      [id]
    );
    return result.rows[0].exists;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllMenuItems,
  getMenuItemById,
  getAllCategories,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  menuItemExists
};

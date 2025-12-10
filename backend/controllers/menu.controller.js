const menuModel = require('../models/menu.model');
const logger = require('../utils/logger');
const MenuDTO = require('../dtos/menu.dto');

// Get all menu items with optional category filter
const getAllMenuItems = async (req, res) => {
  try {
    const { category } = req.query;
    const menuItems = await menuModel.getAllMenuItems(category);

    res.json({
      success: true,
      data: menuItems.map(item => new MenuDTO(item)),
      count: menuItems.length
    });
  } catch (error) {
    logger.error('Error fetching menu items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch menu items',
      message: error.message
    });
  }
};

// Get single menu item by ID
const getMenuItemById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid menu item ID'
      });
    }

    const menuItem = await menuModel.getMenuItemById(id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    res.json({
      success: true,
      data: new MenuDTO(menuItem)
    });
  } catch (error) {
    logger.error('Error fetching menu item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch menu item',
      message: error.message
    });
  }
};

// Get all categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await menuModel.getAllCategories();

    res.json({
      success: true,
      data: categories,
      count: categories.length
    });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
      message: error.message
    });
  }
};

// Create new menu item
const createMenuItem = async (req, res) => {
  try {
    const {
      name, description, price, category, image_url, available, restaurant_id,
      // Enhanced fields
      dietary_tags, allergens, calories, prep_time_minutes, spice_level,
      is_featured, is_new, sort_order, category_id
    } = req.body;

    // Validation
    if (!name || !price || !category || !restaurant_id) {
      return res.status(400).json({
        success: false,
        error: 'Name, price, category, and restaurant_id are required fields'
      });
    }

    if (isNaN(price) || price < 0) {
      return res.status(400).json({
        success: false,
        error: 'Price must be a valid positive number'
      });
    }

    const menuItem = await menuModel.createMenuItem({
      name,
      description,
      price,
      category,
      category_id,
      image_url,
      available,
      restaurant_id,
      dietary_tags,
      allergens,
      calories,
      prep_time_minutes,
      spice_level,
      is_featured,
      is_new,
      sort_order
    });

    res.status(201).json({
      success: true,
      data: new MenuDTO(menuItem),
      message: 'Menu item created successfully'
    });
  } catch (error) {
    logger.error('Error creating menu item:', error);

    // Handle duplicate entry
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Menu item with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create menu item',
      message: error.message
    });
  }
};

// Update menu item
const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid menu item ID'
      });
    }

    // Check if menu item exists
    const exists = await menuModel.menuItemExists(id);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    // Validate price if provided
    if (updates.price !== undefined && (isNaN(updates.price) || updates.price < 0)) {
      return res.status(400).json({
        success: false,
        error: 'Price must be a valid positive number'
      });
    }

    const updatedMenuItem = await menuModel.updateMenuItem(id, updates);

    res.json({
      success: true,
      data: new MenuDTO(updatedMenuItem),
      message: 'Menu item updated successfully'
    });
  } catch (error) {
    logger.error('Error updating menu item:', error);

    if (error.message === 'No fields to update') {
      return res.status(400).json({
        success: false,
        error: 'No valid fields provided for update'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update menu item',
      message: error.message
    });
  }
};

// Delete menu item
const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid menu item ID'
      });
    }

    const deletedMenuItem = await menuModel.deleteMenuItem(id);

    if (!deletedMenuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    res.json({
      success: true,
      data: new MenuDTO(deletedMenuItem),
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting menu item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete menu item',
      message: error.message
    });
  }
};

module.exports = {
  getAllMenuItems,
  getMenuItemById,
  getAllCategories,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
};

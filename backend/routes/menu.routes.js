const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menu.controller');

// GET /api/menu/categories - Get all categories (must be before /:id route)
router.get('/categories', menuController.getAllCategories);

// GET /api/menu - Get all menu items (with optional category filter)
router.get('/', menuController.getAllMenuItems);

// GET /api/menu/:id - Get single menu item by ID
router.get('/:id', menuController.getMenuItemById);

// POST /api/menu - Create new menu item
router.post('/', menuController.createMenuItem);

// PUT /api/menu/:id - Update menu item
router.put('/:id', menuController.updateMenuItem);

// DELETE /api/menu/:id - Delete menu item
router.delete('/:id', menuController.deleteMenuItem);

module.exports = router;

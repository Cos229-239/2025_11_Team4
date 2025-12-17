const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menu.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const {
  crazyOttosMenuItems,
  crazyOttosMenuCategories
} = require('../data/crazyOttosData');


/**
 * @swagger
 * tags:
 *   name: Menu
 *   description: The menu management API
 */

/**
 * @swagger
 * /menu/categories:
 *   get:
 *     summary: Get all menu categories
 *     tags: [Menu]
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
// GET /api/menu/categories - Get all categories (must be before /:id route)
router.get('/categories', menuController.getAllCategories);

/**
 * @swagger
 * /menu:
 *   get:
 *     summary: Get all menu items
 *     tags: [Menu]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category name
 *     responses:
 *       200:
 *         description: List of menu items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */

// GET /api/menu - Get all menu items (with optional category filter)
router.get('/', menuController.getAllMenuItems);

// GET /api/menu/:id - Get single menu item by ID
router.get('/:id', menuController.getMenuItemById);

const { validate } = require('../middleware/validation.middleware');
const { createMenuItemSchema } = require('../utils/validationSchemas');

// ...

// POST /api/menu - Create new menu item
router.post('/', authenticateToken, requireRole(['developer', 'owner']), validate(createMenuItemSchema), menuController.createMenuItem);

// PUT /api/menu/:id - Update menu item
router.put('/:id', authenticateToken, requireRole(['developer', 'owner']), menuController.updateMenuItem);

// DELETE /api/menu/:id - Delete menu item
router.delete('/:id', authenticateToken, requireRole(['developer', 'owner']), menuController.deleteMenuItem);

module.exports = router;

const express = require('express');
const router = express.Router();
const modifierController = require('../controllers/modifier.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     ModifierGroup:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         restaurant_id:
 *           type: integer
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         selection_type:
 *           type: string
 *           enum: [single, multiple]
 *         min_selections:
 *           type: integer
 *         max_selections:
 *           type: integer
 *         is_required:
 *           type: boolean
 *         sort_order:
 *           type: integer
 *         modifiers:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Modifier'
 *     Modifier:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         group_id:
 *           type: integer
 *         name:
 *           type: string
 *         price_adjustment:
 *           type: number
 *         is_default:
 *           type: boolean
 *         is_available:
 *           type: boolean
 *         sort_order:
 *           type: integer
 */

// ============================================================================
// MODIFIER GROUPS ROUTES
// ============================================================================

/**
 * @swagger
 * /modifiers/groups:
 *   get:
 *     summary: Get all modifier groups for a restaurant
 *     tags: [Modifiers]
 *     parameters:
 *       - in: query
 *         name: restaurant_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of modifier groups
 */
router.get('/groups', modifierController.getModifierGroups);

/**
 * @swagger
 * /modifiers/groups/{id}:
 *   get:
 *     summary: Get a modifier group by ID
 *     tags: [Modifiers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Modifier group details
 */
router.get('/groups/:id', modifierController.getModifierGroupById);

/**
 * @swagger
 * /modifiers/groups:
 *   post:
 *     summary: Create a new modifier group
 *     tags: [Modifiers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurant_id
 *               - name
 *             properties:
 *               restaurant_id:
 *                 type: integer
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               selection_type:
 *                 type: string
 *                 enum: [single, multiple]
 *               min_selections:
 *                 type: integer
 *               max_selections:
 *                 type: integer
 *               is_required:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Modifier group created
 */
router.post('/groups', authenticateToken, requireRole(['developer', 'owner']), modifierController.createModifierGroup);

/**
 * @swagger
 * /modifiers/groups/{id}:
 *   put:
 *     summary: Update a modifier group
 *     tags: [Modifiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Modifier group updated
 */
router.put('/groups/:id', authenticateToken, requireRole(['developer', 'owner']), modifierController.updateModifierGroup);

/**
 * @swagger
 * /modifiers/groups/{id}:
 *   delete:
 *     summary: Delete a modifier group
 *     tags: [Modifiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Modifier group deleted
 */
router.delete('/groups/:id', authenticateToken, requireRole(['developer', 'owner']), modifierController.deleteModifierGroup);

// ============================================================================
// MODIFIERS (OPTIONS) ROUTES
// ============================================================================

/**
 * @swagger
 * /modifiers:
 *   get:
 *     summary: Get all modifiers for a group
 *     tags: [Modifiers]
 *     parameters:
 *       - in: query
 *         name: group_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of modifiers
 */
router.get('/', modifierController.getModifiers);

/**
 * @swagger
 * /modifiers:
 *   post:
 *     summary: Create a new modifier
 *     tags: [Modifiers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - group_id
 *               - name
 *             properties:
 *               group_id:
 *                 type: integer
 *               name:
 *                 type: string
 *               price_adjustment:
 *                 type: number
 *               is_default:
 *                 type: boolean
 *               is_available:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Modifier created
 */
router.post('/', authenticateToken, requireRole(['developer', 'owner']), modifierController.createModifier);

/**
 * @swagger
 * /modifiers/{id}:
 *   put:
 *     summary: Update a modifier
 *     tags: [Modifiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Modifier updated
 */
router.put('/:id', authenticateToken, requireRole(['developer', 'owner']), modifierController.updateModifier);

/**
 * @swagger
 * /modifiers/{id}:
 *   delete:
 *     summary: Delete a modifier
 *     tags: [Modifiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Modifier deleted
 */
router.delete('/:id', authenticateToken, requireRole(['developer', 'owner']), modifierController.deleteModifier);

// ============================================================================
// MENU ITEM MODIFIER LINKS
// ============================================================================

/**
 * @swagger
 * /modifiers/menu-item/{menu_item_id}:
 *   get:
 *     summary: Get all modifier groups linked to a menu item
 *     tags: [Modifiers]
 *     parameters:
 *       - in: path
 *         name: menu_item_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of modifier groups for the menu item
 */
router.get('/menu-item/:menu_item_id', modifierController.getMenuItemModifiers);

/**
 * @swagger
 * /modifiers/menu-item/{menu_item_id}:
 *   put:
 *     summary: Update modifier groups linked to a menu item
 *     tags: [Modifiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: menu_item_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               modifier_group_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Menu item modifiers updated
 */
router.put('/menu-item/:menu_item_id', authenticateToken, requireRole(['developer', 'owner']), modifierController.updateMenuItemModifiers);

module.exports = router;

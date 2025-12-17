/**
 * Table Routes
 * API endpoints for table management
 */

const express = require('express');
const router = express.Router();
const tableController = require('../controllers/table.controller');
const { authenticateToken, optionalAuthenticateToken, requireRole } = require('../middleware/auth.middleware');

/**
 * @route   GET /api/tables
 * @desc    Get all tables
 * @access  Public
 */
/**
 * @swagger
 * tags:
 *   name: Tables
 *   description: Table management
 */

/**
 * @swagger
 * /tables:
 *   get:
 *     summary: Get all tables
 *     tags: [Tables]
 *     responses:
 *       200:
 *         description: List of tables
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/', authenticateToken, requireRole(['developer', 'owner', 'employee']), tableController.getAllTables);

/**
 * @route   GET /api/tables/:id
 * @desc    Get single table by ID
 * @access  Public
 */
router.get('/:id', optionalAuthenticateToken, tableController.getTableById);

/**
 * @route   POST /api/tables
 * @desc    Create new table with QR code
 * @access  Public (should be protected in production)
 * @body    {table_number: number, capacity: number, status: string}
 */
const { validate } = require('../middleware/validation.middleware');
const { createTableSchema } = require('../utils/validationSchemas');

// ...

router.post('/', authenticateToken, requireRole(['developer', 'owner']), validate(createTableSchema), tableController.createTable);

/**
 * @route   PATCH /api/tables/:id
 * @desc    Update table
 * @access  Public (should be protected in production)
 * @body    {table_number?: number, capacity?: number, status?: string}
 */
router.patch('/:id', authenticateToken, requireRole(['developer', 'owner']), tableController.updateTable);

/**
 * @route   DELETE /api/tables/:id
 * @desc    Delete table
 * @access  Public (should be protected in production)
 */
router.delete('/:id', authenticateToken, requireRole(['developer', 'owner']), tableController.deleteTable);

/**
 * @route   GET /api/tables/:id/qrcode
 * @desc    Get QR code image for a table
 * @access  Public
 * @query   {format: 'png' | 'dataurl'} - Response format (default: 'png')
 */
router.get('/:id/qrcode', authenticateToken, requireRole(['developer', 'owner']), tableController.getTableQRCode);

/**
 * @route   POST /api/tables/:id/qrcode/regenerate
 * @desc    Regenerate QR code for a table
 * @access  Public (should be protected in production)
 */
router.post('/:id/qrcode/regenerate', authenticateToken, requireRole(['developer', 'owner']), tableController.regenerateQRCode);

module.exports = router;

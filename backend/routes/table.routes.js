/**
 * Table Routes
 * API endpoints for table management
 */

const express = require('express');
const router = express.Router();
const tableController = require('../controllers/table.controller');

/**
 * @route   GET /api/tables
 * @desc    Get all tables
 * @access  Public
 */
router.get('/', tableController.getAllTables);

/**
 * @route   GET /api/tables/:id
 * @desc    Get single table by ID
 * @access  Public
 */
router.get('/:id', tableController.getTableById);

/**
 * @route   POST /api/tables
 * @desc    Create new table with QR code
 * @access  Public (should be protected in production)
 * @body    {table_number: number, capacity: number, status: string}
 */
router.post('/', tableController.createTable);

/**
 * @route   PATCH /api/tables/:id
 * @desc    Update table
 * @access  Public (should be protected in production)
 * @body    {table_number?: number, capacity?: number, status?: string}
 */
router.patch('/:id', tableController.updateTable);

/**
 * @route   DELETE /api/tables/:id
 * @desc    Delete table
 * @access  Public (should be protected in production)
 */
router.delete('/:id', tableController.deleteTable);

/**
 * @route   GET /api/tables/:id/qrcode
 * @desc    Get QR code image for a table
 * @access  Public
 * @query   {format: 'png' | 'dataurl'} - Response format (default: 'png')
 */
router.get('/:id/qrcode', tableController.getTableQRCode);

/**
 * @route   POST /api/tables/:id/qrcode/regenerate
 * @desc    Regenerate QR code for a table
 * @access  Public (should be protected in production)
 */
router.post('/:id/qrcode/regenerate', tableController.regenerateQRCode);

module.exports = router;

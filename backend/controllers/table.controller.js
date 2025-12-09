/**
 * Table Controller
 * Handles HTTP requests for table management
 */

const tableModel = require('../models/table.model');
const logger = require('../utils/logger');
const qrCodeUtil = require('../utils/qrcode.util');
const TableDTO = require('../dtos/table.dto');

/**
 * Get all tables
 * @route GET /api/tables
 */
const getAllTables = async (req, res) => {
  try {
    const tables = await tableModel.getAllTables();

    res.status(200).json({
      success: true,
      data: tables.map(table => new TableDTO(table)),
      count: tables.length,
    });
  } catch (error) {
    logger.error('Error in getAllTables controller:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tables',
      message: error.message,
    });
  }
};

/**
 * Get single table by ID
 * @route GET /api/tables/:id
 */
const getTableById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid table ID',
      });
    }

    const table = await tableModel.getTableById(parseInt(id));

    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found',
      });
    }

    res.status(200).json({
      success: true,
      data: new TableDTO(table),
    });
  } catch (error) {
    logger.error('Error in getTableById controller:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch table',
      message: error.message,
    });
  }
};

/**
 * Create new table with QR code
 * @route POST /api/tables
 * @body {table_number: number, capacity: number, status: string}
 */
const createTable = async (req, res) => {
  try {
    const { table_number, capacity, status, restaurant_id } = req.body;

    // Validate required fields
    if (!table_number || typeof table_number !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Invalid table_number: must be a number',
      });
    }

    if (!restaurant_id) {
      return res.status(400).json({
        success: false,
        error: 'restaurant_id is required',
      });
    }

    // Validate capacity
    if (capacity && (typeof capacity !== 'number' || capacity < 1)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid capacity: must be a positive number',
      });
    }

    // Validate status
    const validStatuses = ['available', 'occupied', 'reserved', 'unavailable'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status: must be one of ${validStatuses.join(', ')}`,
      });
    }

    // Create table first (without QR code)
    const tableData = {
      restaurant_id,
      table_number,
      capacity: capacity || 4,
      status: status || 'available',
      qr_code: null,
    };

    const newTable = await tableModel.createTable(tableData);

    // Generate QR code with the new table ID
    let qrCode = null;
    try {
      qrCode = await qrCodeUtil.generateQRCode(
        newTable.id,
        newTable.table_number
      );

      // Update table with QR code
      const updatedTable = await tableModel.updateTable(newTable.id, {
        qr_code: qrCode,
      });

      res.status(201).json({
        success: true,
        data: new TableDTO(updatedTable),
        message: 'Table created successfully with QR code',
      });
    } catch (qrError) {
      logger.error('Error generating QR code:', qrError);

      // Return table even if QR generation fails
      res.status(201).json({
        success: true,
        data: new TableDTO(newTable),
        message: 'Table created successfully, but QR code generation failed',
        qr_error: qrError.message,
      });
    }
  } catch (error) {
    logger.error('Error in createTable controller:', error);

    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Table number already exists',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create table',
      message: error.message,
    });
  }
};

/**
 * Update table
 * @route PATCH /api/tables/:id
 * @body {table_number?: number, capacity?: number, status?: string}
 */
const updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid table ID',
      });
    }

    // Check if table exists
    const existingTable = await tableModel.getTableById(parseInt(id));
    if (!existingTable) {
      return res.status(404).json({
        success: false,
        error: 'Table not found',
      });
    }

    // Validate updates
    if (updates.table_number !== undefined) {
      if (typeof updates.table_number !== 'number') {
        return res.status(400).json({
          success: false,
          error: 'Invalid table_number: must be a number',
        });
      }

      // Check if new table number already exists
      if (updates.table_number !== existingTable.table_number) {
        const duplicateTable = await tableModel.getTableByNumber(
          updates.table_number
        );
        if (duplicateTable) {
          return res.status(409).json({
            success: false,
            error: `Table number ${updates.table_number} already exists`,
          });
        }
      }
    }

    if (updates.capacity !== undefined) {
      if (typeof updates.capacity !== 'number' || updates.capacity < 1) {
        return res.status(400).json({
          success: false,
          error: 'Invalid capacity: must be a positive number',
        });
      }
    }

    if (updates.status !== undefined) {
      const validStatuses = ['available', 'occupied', 'reserved', 'unavailable'];
      if (!validStatuses.includes(updates.status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status: must be one of ${validStatuses.join(', ')}`,
        });
      }
    }

    // If table_number is changing, regenerate QR code
    if (
      updates.table_number !== undefined &&
      updates.table_number !== existingTable.table_number
    ) {
      try {
        const newQRCode = await qrCodeUtil.generateQRCode(
          existingTable.id,
          updates.table_number
        );
        updates.qr_code = newQRCode;
      } catch (qrError) {
        logger.error('Error regeneratring QR code:', qrError);
        // Continue with update even if QR generation fails
      }
    }

    // Update table
    const updatedTable = await tableModel.updateTable(parseInt(id), updates);

    res.status(200).json({
      success: true,
      data: new TableDTO(updatedTable),
      message: 'Table updated successfully',
    });
  } catch (error) {
    logger.error('Error in updateTable controller:', error);

    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Table number already exists',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update table',
      message: error.message,
    });
  }
};

/**
 * Delete table
 * @route DELETE /api/tables/:id
 */
const deleteTable = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid table ID',
      });
    }

    // Check if table exists
    const existingTable = await tableModel.getTableById(parseInt(id));
    if (!existingTable) {
      return res.status(404).json({
        success: false,
        error: 'Table not found',
      });
    }

    // Delete table
    const deleted = await tableModel.deleteTable(parseInt(id));

    if (deleted) {
      res.status(200).json({
        success: true,
        message: `Table ${existingTable.table_number} deleted successfully`,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete table',
      });
    }
  } catch (error) {
    logger.error('Error in deleteTable controller:', error);

    // Check if error is about active orders
    if (error.message.includes('active order')) {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete table',
      message: error.message,
    });
  }
};

/**
 * Get QR code image for a table
 * @route GET /api/tables/:id/qrcode
 * @query {format: 'png' | 'dataurl'} - Response format (default: 'png')
 */
const getTableQRCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { format } = req.query;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid table ID',
      });
    }

    // Get table
    const table = await tableModel.getTableById(parseInt(id));
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found',
      });
    }

    // If format is dataurl, return stored QR code
    if (format === 'dataurl' && table.qr_code) {
      return res.status(200).json({
        success: true,
        data: {
          qr_code: table.qr_code,
          table_number: table.table_number,
        },
      });
    }

    // Generate fresh PNG buffer
    const qrBuffer = await qrCodeUtil.generateQRCodeBuffer(
      table.id,
      table.table_number
    );

    // Set headers for PNG image
    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="table-${table.table_number}-qr.png"`
    );
    res.status(200).send(qrBuffer);
  } catch (error) {
    logger.error('Error in getTableQRCode controller:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate QR code',
      message: error.message,
    });
  }
};

/**
 * Regenerate QR code for a table
 * @route POST /api/tables/:id/qrcode/regenerate
 */
const regenerateQRCode = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid table ID',
      });
    }

    // Get table
    const table = await tableModel.getTableById(parseInt(id));
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found',
      });
    }

    // Generate new QR code
    const qrCode = await qrCodeUtil.generateQRCode(table.id, table.table_number);

    // Update table with new QR code
    const updatedTable = await tableModel.updateTable(parseInt(id), {
      qr_code: qrCode,
    });

    res.status(200).json({
      success: true,
      data: new TableDTO(updatedTable),
      message: 'QR code regenerated successfully',
    });
  } catch (error) {
    logger.error('Error in regenerateQRCode controller:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate QR code',
      message: error.message,
    });
  }
};

module.exports = {
  getAllTables,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
  getTableQRCode,
  regenerateQRCode,
};

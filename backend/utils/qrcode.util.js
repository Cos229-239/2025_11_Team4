/**
 * QR Code Generation Utility
 * Generates QR codes for table ordering
 */

const QRCode = require('qrcode');
const fs = require('fs').promises;
const path = require('path');

/**
 * Get the base URL based on environment
 * @returns {string} Base URL
 */
const getBaseURL = () => {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production') {
    return process.env.FRONTEND_URL || 'https://ordereasy.app';
  }

  return process.env.FRONTEND_URL || 'http://localhost:5173';
};

/**
 * Generate QR code menu URL for a table
 * @param {number} tableId - Database ID of the table
 * @param {number} tableNumber - Table number displayed to users
 * @returns {string} Full menu URL
 */
const generateMenuURL = (tableId, tableNumber) => {
  const baseURL = getBaseURL();
  return `${baseURL}/menu/${tableId}`;
};

/**
 * Generate QR code as data URL (base64 image)
 * @param {number} tableId - Database ID of the table
 * @param {number} tableNumber - Table number displayed to users
 * @param {Object} options - QR code options
 * @returns {Promise<string>} Data URL (base64 image string)
 */
const generateQRCode = async (tableId, tableNumber, options = {}) => {
  try {
    // Validate inputs
    if (!tableId || typeof tableId !== 'number') {
      throw new Error('Invalid tableId: must be a number');
    }

    if (!tableNumber || typeof tableNumber !== 'number') {
      throw new Error('Invalid tableNumber: must be a number');
    }

    // Generate menu URL
    const menuURL = generateMenuURL(tableId, tableNumber);

    // Default QR code options
    const qrOptions = {
      errorCorrectionLevel: 'M', // Medium error correction
      type: 'image/png',
      quality: 0.95,
      margin: 2,
      width: 400,
      color: {
        dark: '#000000',  // Black dots
        light: '#FFFFFF', // White background
      },
      ...options, // Allow custom options to override defaults
    };

    // Generate QR code as data URL
    const dataURL = await QRCode.toDataURL(menuURL, qrOptions);

    return dataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
};

/**
 * Generate QR code and save as PNG file
 * @param {number} tableId - Database ID of the table
 * @param {number} tableNumber - Table number displayed to users
 * @param {string} outputPath - Full path where PNG file should be saved
 * @param {Object} options - QR code options
 * @returns {Promise<string>} Path to saved file
 */
const generateQRCodeFile = async (tableId, tableNumber, outputPath, options = {}) => {
  try {
    // Validate inputs
    if (!tableId || typeof tableId !== 'number') {
      throw new Error('Invalid tableId: must be a number');
    }

    if (!tableNumber || typeof tableNumber !== 'number') {
      throw new Error('Invalid tableNumber: must be a number');
    }

    if (!outputPath || typeof outputPath !== 'string') {
      throw new Error('Invalid outputPath: must be a string');
    }

    // Generate menu URL
    const menuURL = generateMenuURL(tableId, tableNumber);

    // Default QR code options
    const qrOptions = {
      errorCorrectionLevel: 'M', // Medium error correction
      type: 'png',
      quality: 0.95,
      margin: 2,
      width: 800, // Higher resolution for printing
      color: {
        dark: '#000000',  // Black dots
        light: '#FFFFFF', // White background
      },
      ...options, // Allow custom options to override defaults
    };

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Generate and save QR code as file
    await QRCode.toFile(outputPath, menuURL, qrOptions);

    console.log(`✅ QR code saved: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error generating QR code file:', error);
    throw new Error(`Failed to generate QR code file: ${error.message}`);
  }
};

/**
 * Generate QR code as buffer (useful for sending as response)
 * @param {number} tableId - Database ID of the table
 * @param {number} tableNumber - Table number displayed to users
 * @param {Object} options - QR code options
 * @returns {Promise<Buffer>} PNG image buffer
 */
const generateQRCodeBuffer = async (tableId, tableNumber, options = {}) => {
  try {
    // Validate inputs
    if (!tableId || typeof tableId !== 'number') {
      throw new Error('Invalid tableId: must be a number');
    }

    if (!tableNumber || typeof tableNumber !== 'number') {
      throw new Error('Invalid tableNumber: must be a number');
    }

    // Generate menu URL
    const menuURL = generateMenuURL(tableId, tableNumber);

    // Default QR code options
    const qrOptions = {
      errorCorrectionLevel: 'M', // Medium error correction
      type: 'png',
      quality: 0.95,
      margin: 2,
      width: 800,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      ...options,
    };

    // Generate QR code as buffer
    const buffer = await QRCode.toBuffer(menuURL, qrOptions);

    return buffer;
  } catch (error) {
    console.error('Error generating QR code buffer:', error);
    throw new Error(`Failed to generate QR code buffer: ${error.message}`);
  }
};

/**
 * Generate multiple QR codes for multiple tables
 * @param {Array<{id: number, table_number: number}>} tables - Array of table objects
 * @param {string} outputDir - Directory to save QR code files
 * @returns {Promise<Array<{tableId: number, tableNumber: number, filePath: string}>>}
 */
const generateBulkQRCodes = async (tables, outputDir) => {
  try {
    if (!Array.isArray(tables) || tables.length === 0) {
      throw new Error('Invalid tables: must be a non-empty array');
    }

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Generate QR codes for all tables
    const results = await Promise.all(
      tables.map(async (table) => {
        const fileName = `table-${table.table_number}-qr.png`;
        const filePath = path.join(outputDir, fileName);

        await generateQRCodeFile(table.id, table.table_number, filePath);

        return {
          tableId: table.id,
          tableNumber: table.table_number,
          filePath,
        };
      })
    );

    console.log(`✅ Generated ${results.length} QR codes in ${outputDir}`);
    return results;
  } catch (error) {
    console.error('Error generating bulk QR codes:', error);
    throw new Error(`Failed to generate bulk QR codes: ${error.message}`);
  }
};

module.exports = {
  generateQRCode,
  generateQRCodeFile,
  generateQRCodeBuffer,
  generateBulkQRCodes,
  generateMenuURL,
  getBaseURL,
};

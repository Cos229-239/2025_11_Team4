const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');

/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Upload an image file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 url:
 *                   type: string
 */
router.post('/', authenticateToken, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Return relative URL that can be served by static middleware
    // We replace backslashes with forward slashes for URL compatibility
    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
        success: true,
        message: 'File uploaded successfully',
        url: fileUrl
    });
});

module.exports = router;

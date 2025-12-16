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
router.post('/', authenticateToken, (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            // Multer error (e.g., file too large, wrong type)
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
}, async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    try {
        const fs = require('fs');
        const supabase = require('../utils/supabase');
        const { pool } = require('../config/database');

        // Check if Supabase is configured
        if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
            const fileContent = fs.readFileSync(req.file.path);
            const fileName = `uploads/${Date.now()}_${req.file.filename}`;
            const bucketName = 'assets-01'; // Default sharded bucket

            // Upload to Supabase
            const { data, error } = await supabase
                .storage
                .from(bucketName)
                .upload(fileName, fileContent, {
                    contentType: req.file.mimetype,
                    upsert: false
                });

            if (error) {
                console.error('Supabase upload error:', error);
                throw error;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase
                .storage
                .from(bucketName)
                .getPublicUrl(fileName);

            // Clean up local file
            fs.unlinkSync(req.file.path);

            // Track in media_assets
            try {
                await pool.query(
                    `INSERT INTO media_assets 
                    (uploader_id, file_path, public_url, bucket_name, size_bytes, mime_type) 
                    VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        req.user?.id || null,
                        fileName,
                        publicUrl,
                        bucketName,
                        req.file.size,
                        req.file.mimetype
                    ]
                );
            } catch (dbError) {
                console.error('Failed to track media asset in DB:', dbError);
                // Don't fail the upload just because tracking failed, but log it
            }

            return res.json({
                success: true,
                message: 'File uploaded successfully to Supabase',
                url: publicUrl
            });
        }

        // Fallback to local URL if Supabase not configured
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({
            success: true,
            message: 'File uploaded successfully (local)',
            url: fileUrl
        });

    } catch (error) {
        console.error('Upload handler error:', error);
        // If Supabase failed, keep the local file and return local URL as fallback
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({
            success: true,
            warning: 'Failed to upload to cloud storage, saved locally',
            url: fileUrl
        });
    }
});

module.exports = router;

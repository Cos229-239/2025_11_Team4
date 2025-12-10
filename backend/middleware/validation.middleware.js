const { z } = require('zod');

const validate = (schema) => (req, res, next) => {
    try {
        // Determine location of data (body, query, params) based on what the schema expects?
        // Usually we validate body. Or we can validate req object if schema shape matches.
        // For simplicity, let's assume we validate req.body against schema.
        // If schema is complex (checking body + params), we might need `req` as input?
        // Standard practice: validate body.

        // Using schema.parse(req.body)
        const validData = schema.parse(req.body);
        req.body = validData; // Store valid (and possibly transformed) data
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: error.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
            });
        }
        next(error);
    }
};

module.exports = { validate };

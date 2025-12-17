const { z } = require('zod');
const logger = require('./logger');

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).default('5000'),

    // Database
    DATABASE_URL: z.string().optional(),
    DB_USER: z.string().optional(),
    DB_PASSWORD: z.string().optional(),
    DB_HOST: z.string().default('localhost'),
    DB_PORT: z.string().transform(Number).default('5432'),
    DB_NAME: z.string().default('ordereasy_db'),

    // Auth
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),

    // External Services (Optional but warned if missing)
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),

    // Email
    SEND_EMAILS: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().optional(),
    SMTP_SECURE: z.string().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
});

function validateEnv() {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        // Handle Zod error structure (issues vs errors)
        const errors = result.error.issues || result.error.errors || [];
        const missingVars = errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n');
        logger.error(`Environment validation failed:\n${missingVars}`);
        process.exit(1); // Fail fast
    }

    const env = result.data;
    logger.info('Environment variables validated successfully');

    // Database validation logic
    if (!env.DATABASE_URL && (!env.DB_USER || !env.DB_PASSWORD)) {
        logger.error('Environment validation failed:\nEither DATABASE_URL OR (DB_USER and DB_PASSWORD) must be provided.');
        process.exit(1);
    }

    // Warnings for optional but important configurations
    if (!env.STRIPE_SECRET_KEY) logger.warn('STRIPE_SECRET_KEY is missing. Payments will fail.');

    const sendEmails = String(process.env.SEND_EMAILS || 'false').toLowerCase() === 'true';
    if (sendEmails) {
        if (!process.env.SMTP_HOST) logger.warn('SMTP_HOST is missing. Emails will not be sent.');
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            logger.warn('SMTP_USER/SMTP_PASS missing. Emails may fail depending on SMTP configuration.');
        }
    }

    return env;
}

module.exports = { validateEnv };

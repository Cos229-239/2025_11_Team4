const { pool } = require('../config/database');

const migration = async () => {
    try {
        console.log('Starting migration...');

        // 1. Add columns to users table
        console.log('Adding columns to users table...');
        await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS verification_token TEXT,
      ADD COLUMN IF NOT EXISTS reset_token TEXT,
      ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP,
      ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
    `);

        // 2. Create favorite_orders table
        console.log('Creating favorite_orders table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS favorite_orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

        // 3. Create payment_methods table
        console.log('Creating payment_methods table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        stripe_payment_method_id VARCHAR(255) NOT NULL,
        last4 VARCHAR(4),
        brand VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migration();

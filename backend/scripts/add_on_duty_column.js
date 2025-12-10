
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ DATABASE_URL is not defined in .env');
    process.exit(1);
}

const pool = new Pool({
    connectionString: connectionString,
});

async function updateSchema() {
    try {
        console.log('🔌 Connecting to database...');
        const client = await pool.connect();

        try {
            console.log('Checking for on_duty column in users table...');

            // Check if column exists
            const checkRes = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='users' AND column_name='on_duty';
      `);

            if (checkRes.rowCount === 0) {
                console.log('Adding on_duty column...');
                await client.query(`
          ALTER TABLE users 
          ADD COLUMN on_duty BOOLEAN DEFAULT false;
        `);
                console.log('✅ on_duty column added successfully.');
            } else {
                console.log('ℹ️ on_duty column already exists.');
            }

        } finally {
            client.release();
        }
    } catch (err) {
        console.error('❌ Error updating schema:', err);
    } finally {
        await pool.end();
    }
}

updateSchema();

const { pool } = require('../config/database');

async function runMigration() {
    console.log('Starting migration...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Create user_restaurants table
        console.log('Creating user_restaurants table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS user_restaurants (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (user_id, restaurant_id)
      );
    `);

        // 2. Add on_duty column to users
        console.log('Adding on_duty column to users...');
        await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS on_duty BOOLEAN DEFAULT false;
    `);

        // 3. Add unique constraint to reservation_settings
        console.log('Adding unique constraint to reservation_settings...');
        const checkConstraint = await client.query(`
        SELECT conname
        FROM pg_constraint
        WHERE conname = 'reservation_settings_restaurant_id_key';
    `);

        if (checkConstraint.rows.length === 0) {
            await client.query(`
            ALTER TABLE reservation_settings ADD CONSTRAINT reservation_settings_restaurant_id_key UNIQUE (restaurant_id);
        `);
            console.log('Constraint added.');
        } else {
            console.log('Constraint already exists.');
        }

        // 4. Add updated_at to restaurants
        console.log('Adding updated_at to restaurants...');
        await client.query(`
      ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);

        await client.query('COMMIT');
        console.log('Migration completed successfully.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', error);
    } finally {
        client.release();
        // End the pool so the script exits
        await pool.end();
    }
}

runMigration();

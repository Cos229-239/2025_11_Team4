const db = require('../config/database');

async function run() {
    try {
        console.log('Adding timezone column to restaurants table...');
        await db.query(`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';
    `);
        console.log('Column added successfully.');
        process.exit(0);
    } catch (e) {
        console.error('Error adding column:', e);
        process.exit(1);
    }
}

run();

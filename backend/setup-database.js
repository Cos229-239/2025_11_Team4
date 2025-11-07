// Database setup script
// This script will create all necessary tables and seed data
// Run with: node setup-database.js

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  console.log('🗄️  Setting up OrderEasy Database...\n');
  console.log('='.repeat(50));

  // Create connection pool
  const poolConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'ordereasy',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
      };

  const pool = new Pool(poolConfig);

  try {
    console.log('\n✅ Connecting to database...');
    await pool.query('SELECT NOW()');
    console.log('✅ Connected successfully!');

    // Read and execute schema.sql
    console.log('\n✅ Reading schema.sql...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('✅ Executing schema...');
    await pool.query(schemaSql);
    console.log('✅ Database schema created successfully!');

    // Verify tables were created
    console.log('\n✅ Verifying tables...');
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('📋 Tables created:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Count menu items
    const menuCountResult = await pool.query('SELECT COUNT(*) as count FROM menu_items');
    console.log(`\n✅ Menu items loaded: ${menuCountResult.rows[0].count}`);

    // Show sample menu items
    const menuItemsResult = await pool.query(`
      SELECT name, price, category
      FROM menu_items
      ORDER BY category, name
      LIMIT 5
    `);

    console.log('\n📋 Sample menu items:');
    menuItemsResult.rows.forEach(item => {
      console.log(`   - ${item.name} ($${item.price}) - ${item.category}`);
    });

    console.log('\n' + '='.repeat(50));
    console.log('✅ Database setup completed successfully!');
    console.log('\nYou can now start the server with: npm run dev\n');

  } catch (error) {
    console.error('\n❌ Error setting up database:');
    console.error(error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure PostgreSQL is running and the connection details in .env are correct.');
    } else if (error.code === '3D000') {
      console.error('\n💡 The database does not exist. Create it first with:');
      console.error('   CREATE DATABASE ordereasy;');
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();

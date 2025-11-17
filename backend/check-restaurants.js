// Quick script to check restaurants in database
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkRestaurants() {
  try {
    console.log('🔍 Checking database connection...\n');

    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected!\n');

    // Check restaurants table
    const restaurantsResult = await pool.query('SELECT * FROM restaurants ORDER BY id');
    console.log(`📊 Found ${restaurantsResult.rows.length} restaurants in database:\n`);

    if (restaurantsResult.rows.length === 0) {
      console.log('⚠️  NO RESTAURANTS FOUND IN DATABASE!');
      console.log('   This is why the frontend shows empty.\n');
      console.log('💡 To fix this, you need to:');
      console.log('   1. Run the schema.sql file to seed data, OR');
      console.log('   2. Add restaurants manually via SQL\n');
    } else {
      restaurantsResult.rows.forEach((r, i) => {
        console.log(`${i + 1}. ${r.name}`);
        console.log(`   - ID: ${r.id}`);
        console.log(`   - Cuisine: ${r.cuisine_type}`);
        console.log(`   - Status: ${r.status}`);
        console.log(`   - Rating: ${r.rating}`);
        console.log(`   - Address: ${r.address}`);
        console.log(`   - Lat/Lng: ${r.latitude}, ${r.longitude}`);
        console.log('');
      });
    }

    // Check menu items
    const menuResult = await pool.query('SELECT COUNT(*) as count FROM menu_items');
    console.log(`📋 Menu items: ${menuResult.rows[0].count}`);

    // Check tables
    const tablesResult = await pool.query('SELECT COUNT(*) as count FROM tables');
    console.log(`🪑 Tables: ${tablesResult.rows[0].count}`);

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Database connection refused. Check your .env file.');
    }
    await pool.end();
    process.exit(1);
  }
}

checkRestaurants();

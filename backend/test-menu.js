const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testMenu() {
  try {
    const result = await pool.query(`
      SELECT m.name, m.price, c.name as category
      FROM menu_items m
      JOIN categories c ON m.category_id = c.id
      ORDER BY c.sort_order, m.name;
    `);
    
    console.log('🍽️  Menu Items:\n');
    result.rows.forEach(item => {
      console.log(`  ${item.category}: ${item.name} - $${item.price}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testMenu();
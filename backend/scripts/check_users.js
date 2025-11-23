const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
        ? { rejectUnauthorized: false }
        : undefined
});

async function checkUsers() {
    try {
        const res = await pool.query(`
      SELECT u.id, u.email, u.name, u.role, 
             COALESCE(json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '[]') as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      GROUP BY u.id
    `);
        console.log('Users found:', JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkUsers();

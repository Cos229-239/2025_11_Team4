const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

console.log('Connecting to:', process.env.DATABASE_URL.replace(/:[^:@]*@/, ':****@')); // Hide password

client.connect()
    .then(() => {
        console.log('Connected successfully!');
        return client.query('SELECT NOW()');
    })
    .then(res => {
        console.log('Query result:', res.rows[0]);
        return client.end();
    })
    .catch(err => {
        console.error('Connection error:', err);
        process.exit(1);
    });

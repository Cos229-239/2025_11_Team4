
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
console.log('Checking .env at:', envPath);

if (fs.existsSync(envPath)) {
    console.log('.env file exists.');
    const content = fs.readFileSync(envPath, 'utf8');
    console.log('First 50 chars of .env:', content.substring(0, 50));
} else {
    console.log('.env file DOES NOT exist.');
}

require('dotenv').config();
console.log('JWT_SECRET value:', process.env.JWT_SECRET);

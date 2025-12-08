require('dotenv').config();
const { validateEnv } = require('./utils/env.validation');
console.log('Testing Env Validation...');
try {
    const env = validateEnv();
    console.log('Validation passed!', env.NODE_ENV);
} catch (e) {
    console.error('Validation failed:', e);
}

const express = require('express');
const cors = require('cors');
require('dotenv').config();
// require('./middleware/auth.middleware');
// require('./middleware/rateLimiter');
require('./routes/webhook.routes');
// require('./jobs/cleanup-reservations');
// require('./data/crazyOttosData');
// require('./sockets/order.socket');
// require('./middleware/error.middleware');

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = 5003;
app.listen(PORT, () => {
    console.log(`Minimal server running on ${PORT}`);
});

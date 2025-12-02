const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// Route must be handled before express.json() middleware in server.js
router.post('/', webhookController.handleStripeWebhook);

module.exports = router;

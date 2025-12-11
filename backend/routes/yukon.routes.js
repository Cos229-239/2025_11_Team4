const express = require('express');
const router = express.Router();
const yukonController = require('../controllers/yukon.controller');

// Chat endpoint
router.post('/chat', yukonController.handleChat);

module.exports = router;

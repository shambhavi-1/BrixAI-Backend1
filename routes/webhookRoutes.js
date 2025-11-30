const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Zoho Cliq webhook endpoints
router.post('/channel-message', webhookController.handleChannelMessage);
router.post('/bot-command', webhookController.handleBotCommand);

module.exports = router;

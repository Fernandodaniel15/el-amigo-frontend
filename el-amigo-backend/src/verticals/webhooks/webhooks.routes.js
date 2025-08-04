const express = require('express');
const WebhookController = require('./WebhookController');
const router = express.Router();
router.post('/send', WebhookController.send);
router.post('/register', WebhookController.register);
module.exports = router;

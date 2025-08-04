const express = require('express');
const BotController = require('./BotController');
const router = express.Router();
router.post('/reply', BotController.reply);
router.post('/moderate', BotController.moderate);
module.exports = router;

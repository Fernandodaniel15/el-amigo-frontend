const express = require('express');
const NotificationController = require('./NotificationController');
const router = express.Router();
router.post('/send', NotificationController.send);
router.get('/list', NotificationController.list);
router.post('/mark', NotificationController.mark);
module.exports = router;

const express = require('express');
const AdminController = require('./AdminController');
const router = express.Router();
router.post('/log', AdminController.write);
router.get('/logs', AdminController.logs);
module.exports = router;

const express = require('express');
const ExportController = require('./ExportController');
const router = express.Router();
router.get('/users', ExportController.users);
router.get('/transactions', ExportController.transactions);
module.exports = router;

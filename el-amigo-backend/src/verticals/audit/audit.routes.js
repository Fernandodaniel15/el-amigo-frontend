const express = require('express');
const AuditController = require('./AuditController');
const router = express.Router();
router.post('/log', AuditController.log);
router.get('/list', AuditController.list);
module.exports = router;

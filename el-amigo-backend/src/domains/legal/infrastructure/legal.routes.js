const express = require('express');
const PactController = require('./PactController');
const router = express.Router();
router.post('/sign', PactController.sign);
router.get('/audit/:pactId', PactController.audit);
module.exports = router;

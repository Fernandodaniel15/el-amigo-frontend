const express = require('express');
const BlockchainController = require('./BlockchainController');
const router = express.Router();
router.post('/notarize', BlockchainController.notarize);
router.post('/verify', BlockchainController.verify);
module.exports = router;

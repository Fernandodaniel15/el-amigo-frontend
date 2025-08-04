const express = require('express');
const InfluencerController = require('./InfluencerController');
const router = express.Router();
router.post('/campaign', InfluencerController.campaign);
router.get('/metrics/:id', InfluencerController.metrics);
module.exports = router;

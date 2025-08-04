const express = require('express');
const QuestController = require('./QuestController');
const router = express.Router();
router.post('/quest', QuestController.create);
router.post('/quest/complete', QuestController.complete);
// Agregar: ranking, badges, cityquests
module.exports = router;

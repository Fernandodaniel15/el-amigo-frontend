const express = require('express');
const EventController = require('./EventController');
const router = express.Router();
router.post('/event', EventController.create);
router.get('/events', EventController.list);
// Agregá endpoints: registrar asistencia, agregar misión, cityquest, tickets
module.exports = router;

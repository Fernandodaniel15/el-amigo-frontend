const express = require('express');
const RoomController = require('./RoomController');
const router = express.Router();
router.post('/room', RoomController.create);
router.get('/rooms', RoomController.list);
router.post('/room/join', RoomController.join);
module.exports = router;

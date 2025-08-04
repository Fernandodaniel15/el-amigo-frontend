const express = require('express');
const PostController = require('./PostController');
const router = express.Router();
router.post('/post', PostController.create);
router.get('/feed', PostController.list);
// Otros endpoints: comentar, reaccionar, compartir, etc.
module.exports = router;

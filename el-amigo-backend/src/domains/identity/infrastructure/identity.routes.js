const express = require('express');
const UserController = require('./UserController');
const router = express.Router();
router.post('/register', UserController.register);
// Otros endpoints: login, perfil, kyc, etc.
module.exports = router;

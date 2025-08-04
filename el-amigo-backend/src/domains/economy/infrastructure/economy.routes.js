const express = require('express');
const WalletController = require('./WalletController');
const router = express.Router();
router.post('/transfer', WalletController.transfer);
router.get('/wallet/:userId', WalletController.get);
// Agregá endpoints de pagos, QR, microcréditos, NFT, marketplace
module.exports = router;

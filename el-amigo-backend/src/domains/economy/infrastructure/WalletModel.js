const mongoose = require('mongoose');
const WalletSchema = new mongoose.Schema({
  userId: String,
  saldo: Number,
  moneda: String,
  movimientos: [
    {
      fecha: Date,
      tipo: String,
      monto: Number,
      descripcion: String
    }
  ]
});
module.exports = mongoose.model('Wallet', WalletSchema);

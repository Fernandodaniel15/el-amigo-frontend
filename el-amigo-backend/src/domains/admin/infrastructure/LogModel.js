const mongoose = require('mongoose');
const LogSchema = new mongoose.Schema({
  accion: String,
  userId: String,
  modulo: String,
  fecha: Date,
  detalle: String
});
module.exports = mongoose.model('Log', LogSchema);

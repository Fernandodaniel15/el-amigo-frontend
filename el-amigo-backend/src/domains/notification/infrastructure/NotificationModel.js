const mongoose = require('mongoose');
const NotificationSchema = new mongoose.Schema({
  userId: String,
  mensaje: String,
  tipo: String,
  leido: Boolean,
  fecha: Date
});
module.exports = mongoose.model('Notification', NotificationSchema);

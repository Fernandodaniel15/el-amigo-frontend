const mongoose = require('mongoose');
const RoomSchema = new mongoose.Schema({
  nombre: String,
  tipo: String,
  owner: String,
  users: [String],
  streamingUrl: String,
  isPremium: Boolean
});
module.exports = mongoose.model('Room', RoomSchema);

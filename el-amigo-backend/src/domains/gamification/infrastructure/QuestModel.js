const mongoose = require('mongoose');
const QuestSchema = new mongoose.Schema({
  titulo: String,
  descripcion: String,
  recompensa: String,
  estado: String,
  tipo: String,
  userId: String,
  fecha: Date
});
module.exports = mongoose.model('Quest', QuestSchema);

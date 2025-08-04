const mongoose = require('mongoose');
const EventSchema = new mongoose.Schema({
  nombre: String,
  descripcion: String,
  fecha: Date,
  ubicacion: String,
  tipo: String,
  organizador: String,
  asistentes: [String],
  misiones: [
    {
      titulo: String,
      descripcion: String,
      recompensa: String,
      geo: String
    }
  ]
});
module.exports = mongoose.model('Event', EventSchema);

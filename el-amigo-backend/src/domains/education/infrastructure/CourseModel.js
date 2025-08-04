const mongoose = require('mongoose');
const CourseSchema = new mongoose.Schema({
  titulo: String,
  descripcion: String,
  temas: [String],
  mentor: String,
  alumnos: [String],
  fechaInicio: Date,
  fechaFin: Date,
  status: String
});
module.exports = mongoose.model('Course', CourseSchema);

class Course {
  constructor({ id, titulo, descripcion, temas, mentor, alumnos, fechaInicio, fechaFin, status }) {
    this.id = id;
    this.titulo = titulo;
    this.descripcion = descripcion;
    this.temas = temas || [];
    this.mentor = mentor;
    this.alumnos = alumnos || [];
    this.fechaInicio = fechaInicio;
    this.fechaFin = fechaFin;
    this.status = status || "abierto";
  }
}
module.exports = Course;

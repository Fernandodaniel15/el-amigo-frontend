class Event {
  constructor({ id, nombre, descripcion, fecha, ubicacion, tipo, organizador, asistentes, misiones }) {
    this.id = id;
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.fecha = fecha;
    this.ubicacion = ubicacion;
    this.tipo = tipo || "presencial"; // presencial, virtual, XR
    this.organizador = organizador;
    this.asistentes = asistentes || [];
    this.misiones = misiones || [];
  }
}
module.exports = Event;

class Log {
  constructor({ id, accion, userId, modulo, fecha, detalle }) {
    this.id = id;
    this.accion = accion;
    this.userId = userId;
    this.modulo = modulo;
    this.fecha = fecha || new Date();
    this.detalle = detalle || "";
  }
}
module.exports = Log;

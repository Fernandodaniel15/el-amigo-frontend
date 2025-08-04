class Notification {
  constructor({ id, userId, mensaje, tipo, leido, fecha }) {
    this.id = id;
    this.userId = userId;
    this.mensaje = mensaje;
    this.tipo = tipo || "info"; // info, alerta, campaña
    this.leido = leido || false;
    this.fecha = fecha || new Date();
  }
}
module.exports = Notification;

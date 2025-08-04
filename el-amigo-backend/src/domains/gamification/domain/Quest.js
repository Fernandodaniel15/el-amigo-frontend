class Quest {
  constructor({ id, titulo, descripcion, recompensa, estado, tipo, userId, fecha }) {
    this.id = id;
    this.titulo = titulo;
    this.descripcion = descripcion;
    this.recompensa = recompensa;
    this.estado = estado || "pendiente"; // pendiente, completada, vencida
    this.tipo = tipo || "normal"; // normal, cityquest, challenge
    this.userId = userId;
    this.fecha = fecha || new Date();
  }
}
module.exports = Quest;

// Entidad pura de usuario
class User {
  constructor({ id, email, nombre, avatar, reputacion, kycStatus, roles }) {
    this.id = id;
    this.email = email;
    this.nombre = nombre;
    this.avatar = avatar;
    this.reputacion = reputacion || 0;
    this.kycStatus = kycStatus || "pending";
    this.roles = roles || ["user"];
  }
}
module.exports = User;

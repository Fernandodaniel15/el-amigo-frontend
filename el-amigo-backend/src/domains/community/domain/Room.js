class Room {
  constructor({ id, nombre, tipo, owner, users, streamingUrl, isPremium }) {
    this.id = id;
    this.nombre = nombre;
    this.tipo = tipo || "chat"; // chat, stream, radio, club
    this.owner = owner;
    this.users = users || [];
    this.streamingUrl = streamingUrl || "";
    this.isPremium = isPremium || false;
  }
}
module.exports = Room;

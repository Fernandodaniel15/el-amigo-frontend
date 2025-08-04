class Influencer {
  constructor({ id, userId, seguidores, campañas, sponsors, métricas }) {
    this.id = id;
    this.userId = userId;
    this.seguidores = seguidores || [];
    this.campañas = campañas || [];
    this.sponsors = sponsors || [];
    this.métricas = métricas || {};
  }
}
module.exports = Influencer;

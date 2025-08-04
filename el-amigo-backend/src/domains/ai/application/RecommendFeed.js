const AI = require('../domain/AI');
class RecommendFeed {
  async execute(userId) {
    return AI.recomendarContenido(userId);
  }
}
module.exports = RecommendFeed;

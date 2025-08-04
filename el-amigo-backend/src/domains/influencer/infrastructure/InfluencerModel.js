const mongoose = require('mongoose');
const InfluencerSchema = new mongoose.Schema({
  userId: String,
  seguidores: [String],
  campañas: [Object],
  sponsors: [String],
  métricas: Object
});
module.exports = mongoose.model('Influencer', InfluencerSchema);

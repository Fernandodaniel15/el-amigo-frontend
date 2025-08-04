const InfluencerModel = require('./InfluencerModel');
class InfluencerRepository {
  async addCampaign(influencerId, campaña) {
    return await InfluencerModel.findByIdAndUpdate(
      influencerId,
      { $push: { campañas: campaña } },
      { new: true }
    );
  }
  async getMetrics(influencerId) {
    const influencer = await InfluencerModel.findById(influencerId);
    return influencer ? influencer.métricas : null;
  }
}
module.exports = InfluencerRepository;

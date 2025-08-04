class StartCampaign {
  constructor(influencerRepo) {
    this.influencerRepo = influencerRepo;
  }
  async execute(data) {
    return await this.influencerRepo.addCampaign(data.influencerId, data.campaña);
  }
}
module.exports = StartCampaign;

class GetMetrics {
  constructor(influencerRepo) {
    this.influencerRepo = influencerRepo;
  }
  async execute({ influencerId }) {
    return await this.influencerRepo.getMetrics(influencerId);
  }
}
module.exports = GetMetrics;

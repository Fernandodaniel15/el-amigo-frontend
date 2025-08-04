class AuditConsent {
  constructor(pactRepo) {
    this.pactRepo = pactRepo;
  }
  async execute({ pactId }) {
    return await this.pactRepo.findById(pactId);
  }
}
module.exports = AuditConsent;

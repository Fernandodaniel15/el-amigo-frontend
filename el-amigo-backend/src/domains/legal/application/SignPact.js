class SignPact {
  constructor(pactRepo) {
    this.pactRepo = pactRepo;
  }
  async execute(data) {
    // Validaciones de consentimiento y firmas
    return await this.pactRepo.create(data);
  }
}
module.exports = SignPact;

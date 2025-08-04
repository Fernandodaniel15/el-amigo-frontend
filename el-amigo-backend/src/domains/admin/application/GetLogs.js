class GetLogs {
  constructor(logRepo) {
    this.logRepo = logRepo;
  }
  async execute({ modulo }) {
    return await this.logRepo.listByModulo(modulo);
  }
}
module.exports = GetLogs;

class WriteLog {
  constructor(logRepo) {
    this.logRepo = logRepo;
  }
  async execute(data) {
    return await this.logRepo.create(data);
  }
}
module.exports = WriteLog;

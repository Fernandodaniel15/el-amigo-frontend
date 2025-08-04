class MarkRead {
  constructor(notificationRepo) {
    this.notificationRepo = notificationRepo;
  }
  async execute({ id }) {
    return await this.notificationRepo.markRead(id);
  }
}
module.exports = MarkRead;

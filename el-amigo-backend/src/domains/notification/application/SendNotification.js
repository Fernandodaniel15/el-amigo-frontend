class SendNotification {
  constructor(notificationRepo) {
    this.notificationRepo = notificationRepo;
  }
  async execute(data) {
    return await this.notificationRepo.create(data);
  }
}
module.exports = SendNotification;

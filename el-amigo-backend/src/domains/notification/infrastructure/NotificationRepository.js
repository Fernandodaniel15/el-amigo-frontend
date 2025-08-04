const NotificationModel = require('./NotificationModel');
class NotificationRepository {
  async create(data) {
    return await NotificationModel.create(data);
  }
  async listByUser(userId) {
    return await NotificationModel.find({ userId });
  }
  async markRead(id) {
    return await NotificationModel.findByIdAndUpdate(id, { leido: true }, { new: true });
  }
}
module.exports = NotificationRepository;

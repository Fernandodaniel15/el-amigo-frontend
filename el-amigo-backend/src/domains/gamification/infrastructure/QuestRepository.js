const QuestModel = require('./QuestModel');
class QuestRepository {
  async create(data) {
    return await QuestModel.create(data);
  }
  async listByUser(userId) {
    return await QuestModel.find({ userId });
  }
  async complete(questId, userId) {
    return await QuestModel.findOneAndUpdate(
      { _id: questId, userId },
      { estado: "completada" },
      { new: true }
    );
  }
}
module.exports = QuestRepository;

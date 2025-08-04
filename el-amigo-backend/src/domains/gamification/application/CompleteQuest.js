class CompleteQuest {
  constructor(questRepo) {
    this.questRepo = questRepo;
  }
  async execute({ questId, userId }) {
    return await this.questRepo.complete(questId, userId);
  }
}
module.exports = CompleteQuest;

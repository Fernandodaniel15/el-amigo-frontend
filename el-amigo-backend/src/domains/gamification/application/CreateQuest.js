class CreateQuest {
  constructor(questRepo) {
    this.questRepo = questRepo;
  }
  async execute(data) {
    return await this.questRepo.create(data);
  }
}
module.exports = CreateQuest;

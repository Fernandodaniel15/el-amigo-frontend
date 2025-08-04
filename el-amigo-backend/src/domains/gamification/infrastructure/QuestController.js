const CreateQuest = require('../application/CreateQuest');
const CompleteQuest = require('../application/CompleteQuest');
const QuestRepository = require('./QuestRepository');
const questRepo = new QuestRepository();
const createQuest = new CreateQuest(questRepo);
const completeQuest = new CompleteQuest(questRepo);

exports.create = async (req, res) => {
  try {
    const quest = await createQuest.execute(req.body);
    res.status(201).json({ quest });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.complete = async (req, res) => {
  try {
    const quest = await completeQuest.execute({ questId: req.body.questId, userId: req.body.userId });
    res.json({ quest });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

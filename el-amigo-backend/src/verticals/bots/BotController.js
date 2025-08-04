const Chatbot = require('./Chatbot');
const ModerationBot = require('./ModerationBot');
const chatbot = new Chatbot();
const modbot = new ModerationBot();

exports.reply = async (req, res) => {
  const msg = await chatbot.reply(req.body.message);
  res.json({ reply: msg });
};

exports.moderate = async (req, res) => {
  const result = await modbot.moderate(req.body.content);
  res.json(result);
};

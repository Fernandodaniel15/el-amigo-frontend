const WebhookService = require('./WebhookService');
const service = new WebhookService();

exports.send = async (req, res) => {
  await service.sendEvent(req.body.url, req.body.event);
  res.json({ ok: true });
};

exports.register = async (req, res) => {
  await service.registerWebhook(req.body);
  res.json({ ok: true });
};

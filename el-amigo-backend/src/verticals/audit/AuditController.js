const AuditService = require('./AuditService');
const service = new AuditService();

exports.log = async (req, res) => {
  await service.logAction(req.body);
  res.json({ ok: true });
};

exports.list = async (req, res) => {
  const logs = await service.listActions({ userId: req.query.userId });
  res.json({ logs });
};

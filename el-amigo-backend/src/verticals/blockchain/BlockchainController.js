const BlockchainService = require('./BlockchainService');
const service = new BlockchainService();

exports.notarize = async (req, res) => {
  await service.notarize(req.body.data);
  res.json({ ok: true });
};

exports.verify = async (req, res) => {
  const ok = await service.verifyNotarization(req.body.hash);
  res.json({ ok });
};

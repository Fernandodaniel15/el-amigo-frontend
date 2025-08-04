const ExportService = require('./ExportService');
const service = new ExportService();

exports.users = async (req, res) => {
  const data = await service.exportUsers();
  res.json({ data });
};

exports.transactions = async (req, res) => {
  const data = await service.exportTransactions();
  res.json({ data });
};

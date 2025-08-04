const TransferFunds = require('../application/TransferFunds');
const WalletRepository = require('./WalletRepository');
const walletRepo = new WalletRepository();
const transferFunds = new TransferFunds(walletRepo);

exports.transfer = async (req, res) => {
  try {
    await transferFunds.execute(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.get = async (req, res) => {
  try {
    const wallet = await walletRepo.getByUser(req.params.userId);
    res.json({ wallet });
  } catch (err) {
    res.status(404).json({ error: "No encontrada" });
  }
};

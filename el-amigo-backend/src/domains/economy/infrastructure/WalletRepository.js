const WalletModel = require('./WalletModel');
class WalletRepository {
  async transferir(fromUserId, toUserId, monto) {
    const from = await WalletModel.findOne({ userId: fromUserId });
    const to = await WalletModel.findOne({ userId: toUserId });
    if (!from || from.saldo < monto) throw new Error("Saldo insuficiente");
    from.saldo -= monto;
    to.saldo += monto;
    await from.save();
    await to.save();
  }
  async getByUser(userId) {
    return await WalletModel.findOne({ userId });
  }
}
module.exports = WalletRepository;

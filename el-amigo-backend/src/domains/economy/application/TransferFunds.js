class TransferFunds {
  constructor(walletRepo) {
    this.walletRepo = walletRepo;
  }
  async execute({ fromUserId, toUserId, monto }) {
    await this.walletRepo.transferir(fromUserId, toUserId, monto);
    return { ok: true };
  }
}
module.exports = TransferFunds;

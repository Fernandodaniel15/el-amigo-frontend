class Wallet {
  constructor({ id, userId, saldo, moneda, movimientos }) {
    this.id = id;
    this.userId = userId;
    this.saldo = saldo || 0;
    this.moneda = moneda || "AMG"; // moneda propia
    this.movimientos = movimientos || [];
  }
  agregarMovimiento(mov) {
    this.movimientos.push(mov);
    this.saldo += mov.monto;
  }
}
module.exports = Wallet;

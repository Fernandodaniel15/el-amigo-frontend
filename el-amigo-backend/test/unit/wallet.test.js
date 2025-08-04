const assert = require('assert');
const Wallet = require('../../src/domains/economy/domain/Wallet');
describe('Wallet Entity', () => {
  it('actualiza saldo correctamente', () => {
    const wallet = new Wallet({ id: "w1", userId: "1", saldo: 50 });
    wallet.agregarMovimiento({ monto: 25 });
    assert.equal(wallet.saldo, 75);
  });
});

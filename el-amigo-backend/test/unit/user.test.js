const assert = require('assert');
const User = require('../../src/domains/identity/domain/User');
describe('User Entity', () => {
  it('crea usuario correctamente', () => {
    const user = new User({ id: "1", email: "test@a.com", nombre: "Test" });
    assert.equal(user.email, "test@a.com");
    assert.equal(user.reputacion, 0);
    assert.equal(user.kycStatus, "pending");
  });
});

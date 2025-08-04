const request = require('supertest');
const app = require('../../src/app');
describe('Identity API', () => {
  it('registra usuario', async () => {
    const res = await request(app)
      .post('/api/identity/register')
      .send({ email: "nuevo@a.com", password: "123", nombre: "Nuevo" });
    expect(res.statusCode).toBe(201);
  });
});

const request = require('supertest');
const app = require('../../src/app');
describe('Social API', () => {
  it('crea un post', async () => {
    const res = await request(app)
      .post('/api/social/post')
      .send({ userId: "1", content: "Hello, world!" });
    expect(res.statusCode).toBe(201);
  });
});

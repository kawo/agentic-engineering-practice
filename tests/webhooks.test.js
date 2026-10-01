process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/index');

describe('POST /webhooks/task-update', () => {
  test('acknowledges the webhook', async () => {
    const res = await request(app).post('/webhooks/task-update').send({ task_id: 1, status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });

  test('returns 400 when the body is not valid JSON', async () => {
    const res = await request(app)
      .post('/webhooks/task-update')
      .set('Content-Type', 'application/json')
      .send('{not json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 404 for a GET request', async () => {
    const res = await request(app).get('/webhooks/task-update');
    expect(res.status).toBe(404);
  });
});

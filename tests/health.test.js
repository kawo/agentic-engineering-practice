process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/index');

// These endpoints take no input, so the only error case is a path that
// doesn't exist.

describe('GET /', () => {
  test('describes the API', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: 'Taskr API', version: '1.0.0', docs: '/health' });
  });
});

describe('GET /health', () => {
  test('reports that the API is up, with the current time', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });
});

describe('unknown paths', () => {
  test('returns 404 for a path that does not exist', async () => {
    const res = await request(app).get('/no-such-path');
    expect(res.status).toBe(404);
  });
});

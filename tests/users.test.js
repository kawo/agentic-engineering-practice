process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/index');
const { db } = require('../src/db/connection');
const { createSchema } = require('../src/db/schema');

beforeAll(() => {
  createSchema(db);
});

beforeEach(() => {
  db.exec('DELETE FROM task_tags; DELETE FROM comments; DELETE FROM tasks; DELETE FROM projects; DELETE FROM users; DELETE FROM tags;');
});

function createUser(name, email) {
  return request(app).post('/users').send({ name, email });
}

describe('GET /users', () => {
  // Takes no input, so it has no client error cases to test.
  test('returns an empty array when there are no users', async () => {
    const res = await request(app).get('/users');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns all users', async () => {
    await createUser('User One', 'one@test.com');
    await createUser('User Two', 'two@test.com');
    const res = await request(app).get('/users');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map(u => u.email).sort()).toEqual(['one@test.com', 'two@test.com']);
  });
});

describe('POST /users', () => {
  test('creates a user and returns it', async () => {
    const res = await createUser('Alice Chen', 'alice@test.com');
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Alice Chen');
    expect(res.body.email).toBe('alice@test.com');
  });

  test('returns 400 when name is missing', async () => {
    const res = await request(app).post('/users').send({ email: 'noname@test.com' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'name is required' });
  });

  test('returns 400 when name is blank', async () => {
    const res = await createUser('   ', 'blank@test.com');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'name is required' });
  });

  test('returns 400 when email is missing', async () => {
    const res = await request(app).post('/users').send({ name: 'No Email' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'email is required' });
  });

  test('returns 400 when email is not a valid address', async () => {
    const res = await createUser('Bad Email', 'not-an-email');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid email address' });
  });

  test('returns 409 when the email is already registered', async () => {
    await createUser('Alice', 'dup@test.com');
    const res = await createUser('Alice Again', 'dup@test.com');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'email already exists' });
  });
});

describe('GET /users/:id', () => {
  test('returns the user', async () => {
    const created = await createUser('Bob', 'bob@test.com');
    const res = await request(app).get(`/users/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Bob');
    expect(res.body.email).toBe('bob@test.com');
  });

  test('returns 404 when the user does not exist', async () => {
    const res = await request(app).get('/users/99999');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'User not found' });
  });

  test('returns 404 when the id is not a number', async () => {
    const res = await request(app).get('/users/abc');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'User not found' });
  });
});

describe('PUT /users/:id', () => {
  test('updates the name and keeps the existing email', async () => {
    const created = await createUser('Old Name', 'update@test.com');
    const res = await request(app).put(`/users/${created.body.id}`).send({ name: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
    expect(res.body.email).toBe('update@test.com');
  });

  test('returns 404 when the user does not exist', async () => {
    const res = await request(app).put('/users/99999').send({ name: 'Ghost' });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'User not found' });
  });

  // Current behaviour, kept on purpose during the refactor: a duplicate email
  // on update is not mapped to 409.
  test('returns 500 when the new email belongs to another user', async () => {
    await createUser('First', 'first@test.com');
    const second = await createUser('Second', 'second@test.com');
    const res = await request(app).put(`/users/${second.body.id}`).send({ email: 'first@test.com' });
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});

describe('DELETE /users/:id', () => {
  test('deletes the user', async () => {
    const created = await createUser('Delete Me', 'deleteme@test.com');
    const res = await request(app).delete(`/users/${created.body.id}`).set('x-api-key', 'dev-key');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });

    const check = await request(app).get(`/users/${created.body.id}`);
    expect(check.status).toBe(404);
  });

  test('returns 401 without an API key', async () => {
    const created = await createUser('Keep Me', 'keep@test.com');
    const res = await request(app).delete(`/users/${created.body.id}`);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  test('returns 401 with the wrong API key', async () => {
    const created = await createUser('Keep Me', 'keep@test.com');
    const res = await request(app).delete(`/users/${created.body.id}`).set('x-api-key', 'wrong');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  test('returns 404 when the user does not exist', async () => {
    const res = await request(app).delete('/users/99999').set('x-api-key', 'dev-key');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'User not found' });
  });
});

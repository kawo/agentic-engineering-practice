process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../index');
const { db } = require('../DB');
const { createSchema } = require('./schema');

let taskId;

beforeAll(() => {
  createSchema(db);
});

beforeEach(() => {
  db.exec('DELETE FROM task_tags; DELETE FROM comments; DELETE FROM tasks; DELETE FROM projects; DELETE FROM users; DELETE FROM tags;');
  db.prepare('INSERT INTO users (id, name, email) VALUES (1, ?, ?)').run('Alice', 'alice@test.com');
  db.prepare('INSERT INTO users (id, name, email) VALUES (2, ?, ?)').run('Bob', 'bob@test.com');
  taskId = db.prepare("INSERT INTO tasks (title) VALUES ('Discuss me')").run().lastInsertRowid;
});

describe('GET /tasks/:id/comments', () => {
  test('returns an empty array when the task has no comments', async () => {
    const res = await request(app).get(`/tasks/${taskId}/comments`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("returns the task's comments oldest first, with each author's name", async () => {
    const insert = db.prepare('INSERT INTO comments (task_id, user_id, body, created_at) VALUES (?, ?, ?, ?)');
    insert.run(taskId, 2, 'Second', '2026-01-02 00:00:00');
    insert.run(taskId, 1, 'First', '2026-01-01 00:00:00');
    const otherTask = db.prepare("INSERT INTO tasks (title) VALUES ('Other')").run().lastInsertRowid;
    insert.run(otherTask, 1, 'Elsewhere', '2026-01-01 00:00:00');

    const res = await request(app).get(`/tasks/${taskId}/comments`);
    expect(res.status).toBe(200);
    expect(res.body.map(c => [c.body, c.user_name])).toEqual([['First', 'Alice'], ['Second', 'Bob']]);
  });

  test('returns 404 when the task does not exist', async () => {
    const res = await request(app).get('/tasks/99999/comments');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });

  test('returns 404 when the task id is not a number', async () => {
    const res = await request(app).get('/tasks/abc/comments');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });
});

describe('POST /tasks/:id/comments', () => {
  test("adds a comment and returns it with the author's name", async () => {
    const res = await request(app).post(`/tasks/${taskId}/comments`).send({ user_id: 1, body: 'Looks good' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.task_id).toBe(taskId);
    expect(res.body.user_id).toBe(1);
    expect(res.body.body).toBe('Looks good');
    expect(res.body.user_name).toBe('Alice');

    const list = await request(app).get(`/tasks/${taskId}/comments`);
    expect(list.body).toHaveLength(1);
  });

  test('returns 404 when the task does not exist', async () => {
    const res = await request(app).post('/tasks/99999/comments').send({ user_id: 1, body: 'Hello' });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });

  test('returns 404 for an unknown task before checking the body', async () => {
    const res = await request(app).post('/tasks/99999/comments').send({});
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });

  test('returns 400 when body is missing', async () => {
    const res = await request(app).post(`/tasks/${taskId}/comments`).send({ user_id: 1 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'body is required' });
  });

  test('returns 400 when body is blank', async () => {
    const res = await request(app).post(`/tasks/${taskId}/comments`).send({ user_id: 1, body: '   ' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'body is required' });
  });

  test('returns 400 when user_id is missing', async () => {
    const res = await request(app).post(`/tasks/${taskId}/comments`).send({ body: 'Anonymous' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'user_id is required' });
  });

  test('returns 400 when the user does not exist', async () => {
    const res = await request(app).post(`/tasks/${taskId}/comments`).send({ user_id: 999, body: 'Ghost' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'user not found' });
  });
});

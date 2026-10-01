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
  taskId = db.prepare("INSERT INTO tasks (title) VALUES ('Tag me')").run().lastInsertRowid;
});

function insertTag(name) {
  return db.prepare('INSERT INTO tags (name) VALUES (?)').run(name).lastInsertRowid;
}

describe('GET /tags', () => {
  // Takes no input, so it has no client error cases to test.
  test('returns an empty array when there are no tags', async () => {
    const res = await request(app).get('/tags');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns all tags sorted by name', async () => {
    insertTag('urgent');
    insertTag('bug');
    insertTag('frontend');
    const res = await request(app).get('/tags');
    expect(res.status).toBe(200);
    expect(res.body.map(t => t.name)).toEqual(['bug', 'frontend', 'urgent']);
  });
});

describe('POST /tags', () => {
  test('creates a tag, stored lowercase and trimmed', async () => {
    const res = await request(app).post('/tags').send({ name: '  Urgent ' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('urgent');
  });

  test('returns 400 when name is missing', async () => {
    const res = await request(app).post('/tags').send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'name is required' });
  });

  test('returns 400 when name is blank', async () => {
    const res = await request(app).post('/tags').send({ name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'name is required' });
  });

  test('returns 409 when the tag already exists, ignoring case', async () => {
    insertTag('urgent');
    const res = await request(app).post('/tags').send({ name: 'URGENT' });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'tag already exists' });
  });
});

describe('POST /tasks/:id/tags', () => {
  test('applies a tag to the task', async () => {
    const tagId = insertTag('bug');
    const res = await request(app).post(`/tasks/${taskId}/tags`).send({ tag_id: tagId });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ task_id: taskId, tag_id: tagId });

    const task = await request(app).get(`/tasks/${taskId}`);
    expect(task.body.tags.map(t => t.name)).toEqual(['bug']);
  });

  test('returns 404 when the task does not exist', async () => {
    const tagId = insertTag('bug');
    const res = await request(app).post('/tasks/99999/tags').send({ tag_id: tagId });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });

  test('returns 404 for an unknown task before checking tag_id', async () => {
    const res = await request(app).post('/tasks/99999/tags').send({});
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });

  test('returns 400 when tag_id is missing', async () => {
    const res = await request(app).post(`/tasks/${taskId}/tags`).send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'tag_id is required' });
  });

  test('returns 404 when the tag does not exist', async () => {
    const res = await request(app).post(`/tasks/${taskId}/tags`).send({ tag_id: 999 });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Tag not found' });
  });

  test('returns 409 when the tag is already applied to the task', async () => {
    const tagId = insertTag('bug');
    await request(app).post(`/tasks/${taskId}/tags`).send({ tag_id: tagId });
    const res = await request(app).post(`/tasks/${taskId}/tags`).send({ tag_id: tagId });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'tag already applied to this task' });
  });
});

describe('DELETE /tasks/:id/tags/:tagId', () => {
  test('removes the tag from the task', async () => {
    const tagId = insertTag('bug');
    db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)').run(taskId, tagId);
    const res = await request(app).delete(`/tasks/${taskId}/tags/${tagId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });

    const task = await request(app).get(`/tasks/${taskId}`);
    expect(task.body.tags).toEqual([]);
  });

  test('returns 404 when the tag is not applied to the task', async () => {
    const tagId = insertTag('bug');
    const res = await request(app).delete(`/tasks/${taskId}/tags/${tagId}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Tag not applied to this task' });
  });

  test('returns 404 when the task does not exist', async () => {
    const tagId = insertTag('bug');
    const res = await request(app).delete(`/tasks/99999/tags/${tagId}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Tag not applied to this task' });
  });
});

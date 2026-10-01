process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../index');
const { db } = require('../DB');
const { createSchema } = require('./schema');

beforeAll(() => {
  createSchema(db);
});

beforeEach(() => {
  db.exec('DELETE FROM task_tags; DELETE FROM comments; DELETE FROM tasks; DELETE FROM projects; DELETE FROM users; DELETE FROM tags;');
  db.prepare('INSERT INTO users (id, name, email) VALUES (1, ?, ?)').run('Test User', 'test@example.com');
  db.prepare('INSERT INTO projects (id, name) VALUES (1, ?)').run('Test Project');
});

function insertTask(title, fields = {}) {
  const { status = 'active', project_id = null, assignee_id = null, created_at = null } = fields;
  const result = created_at
    ? db.prepare('INSERT INTO tasks (title, status, project_id, assignee_id, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(title, status, project_id, assignee_id, created_at)
    : db.prepare('INSERT INTO tasks (title, status, project_id, assignee_id) VALUES (?, ?, ?, ?)')
      .run(title, status, project_id, assignee_id);
  return result.lastInsertRowid;
}

const STATUS_ERROR = { error: 'status must be one of: active, completed, archived' };

describe('GET /tasks', () => {
  test('returns an empty array when there are no tasks', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns all tasks', async () => {
    insertTask('Task A');
    insertTask('Task B', { status: 'completed' });
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('filters by ?status=active', async () => {
    insertTask('Active Task');
    insertTask('Done Task', { status: 'completed' });
    const res = await request(app).get('/tasks?status=active');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Active Task');
  });

  test('filters by ?status=completed', async () => {
    insertTask('Active Task');
    insertTask('Done Task', { status: 'completed' });
    const res = await request(app).get('/tasks?status=completed');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Done Task');
  });

  test('filters by ?project_id', async () => {
    insertTask('Task in project', { project_id: 1 });
    insertTask('Unassigned task');
    const res = await request(app).get('/tasks?project_id=1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Task in project');
  });

  test('filters by ?assignee_id', async () => {
    insertTask('Assigned task', { assignee_id: 1 });
    insertTask('Unassigned task');
    const res = await request(app).get('/tasks?assignee_id=1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Assigned task');
  });

  test('returns tasks newest first, paged by ?page and ?page_size', async () => {
    insertTask('Oldest', { created_at: '2026-01-01 00:00:00' });
    insertTask('Middle', { created_at: '2026-01-02 00:00:00' });
    insertTask('Newest', { created_at: '2026-01-03 00:00:00' });

    const first = await request(app).get('/tasks?page_size=2');
    expect(first.body.map(t => t.title)).toEqual(['Newest', 'Middle']);

    const second = await request(app).get('/tasks?page=2&page_size=2');
    expect(second.body.map(t => t.title)).toEqual(['Oldest']);
  });

  test('returns at most 20 tasks by default and caps page_size at 100', async () => {
    const insert = db.prepare("INSERT INTO tasks (title) VALUES ('Bulk')");
    db.transaction(() => { for (let i = 0; i < 120; i++) insert.run(); })();

    const byDefault = await request(app).get('/tasks');
    expect(byDefault.body).toHaveLength(20);

    const capped = await request(app).get('/tasks?page_size=500');
    expect(capped.body).toHaveLength(100);
  });

  test('returns 400 for an invalid status value', async () => {
    const res = await request(app).get('/tasks?status=invalid');
    expect(res.status).toBe(400);
    expect(res.body).toEqual(STATUS_ERROR);
  });
});

describe('POST /tasks', () => {
  test('creates an active task and returns it', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'New Task', description: 'Do the thing', due_date: '2026-12-31' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('New Task');
    expect(res.body.description).toBe('Do the thing');
    expect(res.body.due_date).toBe('2026-12-31');
    expect(res.body.status).toBe('active');
    expect(res.body.completed_at).toBeNull();
  });

  test('creates a task assigned to a project and a user', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Project Task', project_id: 1, assignee_id: 1 });
    expect(res.status).toBe(201);
    expect(res.body.project_id).toBe(1);
    expect(res.body.assignee_id).toBe(1);
  });

  test('returns 400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({ description: 'No title here' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'title is required' });
  });

  test('returns 400 when title is blank', async () => {
    const res = await request(app).post('/tasks').send({ title: '   ' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'title is required' });
  });

  // Current behaviour, kept on purpose during the refactor: an unknown project
  // or assignee is a 400, not a 404.
  test('returns 400 when the project does not exist', async () => {
    const res = await request(app).post('/tasks').send({ title: 'Orphan', project_id: 999 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'project not found' });
  });

  test('returns 400 when the assignee does not exist', async () => {
    const res = await request(app).post('/tasks').send({ title: 'Orphan', assignee_id: 999 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'assignee not found' });
  });
});

describe('GET /tasks/:id', () => {
  test('returns the task with its tags and comments', async () => {
    const taskId = insertTask('Find Me');
    const tag = db.prepare("INSERT INTO tags (name) VALUES ('urgent')").run();
    db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)').run(taskId, tag.lastInsertRowid);
    db.prepare("INSERT INTO comments (task_id, user_id, body) VALUES (?, 1, 'First!')").run(taskId);

    const res = await request(app).get(`/tasks/${taskId}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Find Me');
    expect(res.body.tags).toEqual([{ id: tag.lastInsertRowid, name: 'urgent' }]);
    expect(res.body.comments).toHaveLength(1);
    expect(res.body.comments[0].body).toBe('First!');
    expect(res.body.comments[0].user_name).toBe('Test User');
  });

  test('returns 404 when the task does not exist', async () => {
    const res = await request(app).get('/tasks/99999');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });

  test('returns 404 when the id is not a number', async () => {
    const res = await request(app).get('/tasks/abc');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });
});

describe('PUT /tasks/:id', () => {
  test('marks a task completed and records when', async () => {
    const taskId = insertTask('Update Me');
    const res = await request(app).put(`/tasks/${taskId}`).send({ status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.completed_at).not.toBeNull();
  });

  test('keeps the original completion time when a completed task is updated again', async () => {
    const taskId = insertTask('Done');
    db.prepare("UPDATE tasks SET status = 'completed', completed_at = '2026-01-01T00:00:00.000Z' WHERE id = ?").run(taskId);
    const res = await request(app).put(`/tasks/${taskId}`).send({ title: 'Done, renamed' });
    expect(res.status).toBe(200);
    expect(res.body.completed_at).toBe('2026-01-01T00:00:00.000Z');
  });

  test('clears the completion time when a task leaves completed', async () => {
    const taskId = insertTask('Reopen Me');
    await request(app).put(`/tasks/${taskId}`).send({ status: 'completed' });
    const res = await request(app).put(`/tasks/${taskId}`).send({ status: 'active' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
    expect(res.body.completed_at).toBeNull();
  });

  test('updates the title and keeps the other fields', async () => {
    const taskId = insertTask('Old Title', { project_id: 1 });
    const res = await request(app).put(`/tasks/${taskId}`).send({ title: 'New Title' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New Title');
    expect(res.body.project_id).toBe(1);
    expect(res.body.status).toBe('active');
  });

  test('returns 404 when the task does not exist', async () => {
    const res = await request(app).put('/tasks/99999').send({ title: 'Ghost' });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });

  test('returns 404 for an unknown task even when the status is also invalid', async () => {
    const res = await request(app).put('/tasks/99999').send({ status: 'bogus' });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });

  test('returns 400 for an invalid status', async () => {
    const taskId = insertTask('Status Test');
    const res = await request(app).put(`/tasks/${taskId}`).send({ status: 'bogus' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual(STATUS_ERROR);
  });
});

describe('DELETE /tasks/:id', () => {
  test('deletes the task', async () => {
    const taskId = insertTask('Delete Me');
    const res = await request(app).delete(`/tasks/${taskId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });

    const check = await request(app).get(`/tasks/${taskId}`);
    expect(check.status).toBe(404);
  });

  test('returns 404 when the task does not exist', async () => {
    const res = await request(app).delete('/tasks/99999');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });

  test('returns 404 when the id is not a number', async () => {
    const res = await request(app).delete('/tasks/abc');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });
});

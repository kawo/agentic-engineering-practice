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
  db.prepare('INSERT INTO users (id, name, email) VALUES (1, ?, ?)').run('Project Owner', 'owner@test.com');
});

function createProject(body) {
  return request(app).post('/projects').send(body);
}

describe('GET /projects', () => {
  // Takes no input, so it has no client error cases to test.
  test('returns an empty array when there are no projects', async () => {
    const res = await request(app).get('/projects');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns all projects', async () => {
    await createProject({ name: 'Alpha' });
    await createProject({ name: 'Beta' });
    const res = await request(app).get('/projects');
    expect(res.status).toBe(200);
    expect(res.body.map(p => p.name).sort()).toEqual(['Alpha', 'Beta']);
  });
});

describe('POST /projects', () => {
  test('creates a project and returns it', async () => {
    const res = await createProject({ name: 'My Project', description: 'A test project', owner_id: 1 });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('My Project');
    expect(res.body.description).toBe('A test project');
    expect(res.body.owner_id).toBe(1);
  });

  test('stores missing description and owner as null', async () => {
    const res = await createProject({ name: 'Bare Project' });
    expect(res.status).toBe(201);
    expect(res.body.description).toBeNull();
    expect(res.body.owner_id).toBeNull();
  });

  test('returns 400 when name is missing', async () => {
    const res = await createProject({ description: 'No name' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'name is required' });
  });

  test('returns 400 when name is blank', async () => {
    const res = await createProject({ name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'name is required' });
  });
});

describe('GET /projects/:id', () => {
  test('returns the project with task counts by status', async () => {
    const created = await createProject({ name: 'Stats Project' });
    const projectId = created.body.id;
    await request(app).post('/tasks').send({ title: 'Active task', project_id: projectId });
    await request(app).post('/tasks').send({ title: 'Another active', project_id: projectId });
    db.prepare("INSERT INTO tasks (title, status, project_id) VALUES ('Done', 'completed', ?)").run(projectId);

    const res = await request(app).get(`/projects/${projectId}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Stats Project');
    expect(res.body.stats).toEqual({ total: 3, active: 2, completed: 1, archived: 0 });
  });

  test('returns 404 when the project does not exist', async () => {
    const res = await request(app).get('/projects/99999');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Project not found' });
  });

  test('returns 404 when the id is not a number', async () => {
    const res = await request(app).get('/projects/abc');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Project not found' });
  });
});

describe('PUT /projects/:id', () => {
  test('updates the given fields and keeps the rest', async () => {
    const created = await createProject({ name: 'Old Name', owner_id: 1 });
    const res = await request(app)
      .put(`/projects/${created.body.id}`)
      .send({ name: 'New Name', description: 'Updated desc' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
    expect(res.body.description).toBe('Updated desc');
    expect(res.body.owner_id).toBe(1);
  });

  test('returns 404 when the project does not exist', async () => {
    const res = await request(app).put('/projects/99999').send({ name: 'Ghost' });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Project not found' });
  });

  test('returns 404 when the id is not a number', async () => {
    const res = await request(app).put('/projects/abc').send({ name: 'Ghost' });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Project not found' });
  });
});

describe('DELETE /projects/:id', () => {
  test('deletes the project', async () => {
    const created = await createProject({ name: 'Doomed Project' });
    const res = await request(app).delete(`/projects/${created.body.id}`).set('x-api-key', 'dev-key');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });

    const check = await request(app).get(`/projects/${created.body.id}`);
    expect(check.status).toBe(404);
  });

  test('returns 401 without an API key', async () => {
    const created = await createProject({ name: 'Safe Project' });
    const res = await request(app).delete(`/projects/${created.body.id}`);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  test('returns 404 when the project does not exist', async () => {
    const res = await request(app).delete('/projects/99999').set('x-api-key', 'dev-key');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Project not found' });
  });

  // Current behaviour, kept on purpose during the refactor: the foreign key
  // rejects the delete and the error is not mapped to a 4xx.
  test('returns 500 when the project still has tasks', async () => {
    const created = await createProject({ name: 'Busy Project' });
    await request(app).post('/tasks').send({ title: 'Blocking task', project_id: created.body.id });
    const res = await request(app).delete(`/projects/${created.body.id}`).set('x-api-key', 'dev-key');
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});

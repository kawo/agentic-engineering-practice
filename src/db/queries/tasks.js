const { db } = require('../connection');

function findMany({ status, projectId, assigneeId, limit, offset }) {
  let query = 'SELECT * FROM tasks';
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (projectId) {
    conditions.push('project_id = ?');
    params.push(projectId);
  }
  if (assigneeId) {
    conditions.push('assignee_id = ?');
    params.push(assigneeId);
  }
  if (conditions.length) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(query).all(params);
}

function findById(id) {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}

function insert({ title, description, project_id, assignee_id, due_date }) {
  return db.prepare(
    'INSERT INTO tasks (title, description, project_id, assignee_id, due_date) VALUES (?, ?, ?, ?, ?)'
  ).run(title, description, project_id, assignee_id, due_date).lastInsertRowid;
}

function update(id, { title, description, status, project_id, assignee_id, due_date, completed_at }) {
  db.prepare(
    'UPDATE tasks SET title=?, description=?, status=?, project_id=?, assignee_id=?, due_date=?, completed_at=? WHERE id=?'
  ).run(title, description, status, project_id, assignee_id, due_date, completed_at, id);
}

function remove(id) {
  return db.prepare('DELETE FROM tasks WHERE id = ?').run(id).changes;
}

module.exports = { findMany, findById, insert, update, remove };

const { db } = require('../connection');

function findAll() {
  return db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
}

function findById(id) {
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
}

function insert({ name, description, owner_id }) {
  return db.prepare(
    'INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)'
  ).run(name, description, owner_id).lastInsertRowid;
}

function update(id, { name, description, owner_id }) {
  db.prepare(
    'UPDATE projects SET name = ?, description = ?, owner_id = ? WHERE id = ?'
  ).run(name, description, owner_id, id);
}

function remove(id) {
  return db.prepare('DELETE FROM projects WHERE id = ?').run(id).changes;
}

function countTasksByStatus(projectId) {
  return db.prepare(
    'SELECT status, COUNT(*) as count FROM tasks WHERE project_id = ? GROUP BY status'
  ).all(projectId);
}

module.exports = { findAll, findById, insert, update, remove, countTasksByStatus };

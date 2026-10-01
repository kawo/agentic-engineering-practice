const { db } = require('../connection');

function findAll() {
  return db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
}

function findById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function insert({ name, email }) {
  return db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(name, email).lastInsertRowid;
}

function update(id, { name, email }) {
  db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name, email, id);
}

function remove(id) {
  return db.prepare('DELETE FROM users WHERE id = ?').run(id).changes;
}

module.exports = { findAll, findById, insert, update, remove };

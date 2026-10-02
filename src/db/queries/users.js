const { db } = require('../connection');

/**
 * @description Finds every user, newest first.
 * @returns {Object[]} The user rows.
 */
function findAll() {
  return db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
}

/**
 * @description Finds one user by ID.
 * @param {number} id - The ID of the user.
 * @returns {Object|undefined} The user row, or `undefined` if none exists.
 */
function findById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

/**
 * @description Inserts a user.
 * @param {Object} user - The user to insert.
 * @param {string} user.name - The name of the user.
 * @param {string} user.email - The email address, which must be unique.
 * @returns {number} The ID of the new user.
 */
function insert({ name, email }) {
  return db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(name, email).lastInsertRowid;
}

/**
 * @description Overwrites the name and email of a user.
 * @param {number} id - The ID of the user.
 * @param {Object} fields - The new values.
 * @param {string} fields.name - The new name.
 * @param {string} fields.email - The new email address.
 * @returns {void} Nothing.
 */
function update(id, { name, email }) {
  db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name, email, id);
}

/**
 * @description Deletes a user by ID.
 * @param {number} id - The ID of the user.
 * @returns {number} The number of rows deleted: `1` if the user existed, otherwise `0`.
 */
function remove(id) {
  return db.prepare('DELETE FROM users WHERE id = ?').run(id).changes;
}

module.exports = { findAll, findById, insert, update, remove };

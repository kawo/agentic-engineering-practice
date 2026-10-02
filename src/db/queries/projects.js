const { db } = require('../connection');

/**
 * @description Finds every project, newest first.
 * @returns {Object[]} The project rows.
 */
function findAll() {
  return db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
}

/**
 * @description Finds one project by ID.
 * @param {number} id - The ID of the project.
 * @returns {Object|undefined} The project row, or `undefined` if none exists.
 */
function findById(id) {
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
}

/**
 * @description Inserts a project.
 * @param {Object} project - The project to insert.
 * @param {string} project.name - The name of the project.
 * @param {?string} project.description - The description of the project, or `null`.
 * @param {?number} project.owner_id - The ID of the user who owns the project, or `null`.
 * @returns {number} The ID of the new project.
 */
function insert({ name, description, owner_id }) {
  return db.prepare(
    'INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)'
  ).run(name, description, owner_id).lastInsertRowid;
}

/**
 * @description Overwrites every editable field of a project.
 * @param {number} id - The ID of the project.
 * @param {Object} fields - The new values.
 * @param {string} fields.name - The new name.
 * @param {?string} fields.description - The new description, or `null`.
 * @param {?number} fields.owner_id - The ID of the new owner, or `null`.
 * @returns {void} Nothing.
 */
function update(id, { name, description, owner_id }) {
  db.prepare(
    'UPDATE projects SET name = ?, description = ?, owner_id = ? WHERE id = ?'
  ).run(name, description, owner_id, id);
}

/**
 * @description Deletes a project by ID.
 * @param {number} id - The ID of the project.
 * @returns {number} The number of rows deleted: `1` if the project existed, otherwise `0`.
 */
function remove(id) {
  return db.prepare('DELETE FROM projects WHERE id = ?').run(id).changes;
}

/**
 * @description Counts the tasks in a project, grouped by status.
 * @param {number} projectId - The ID of the project.
 * @returns {Array<{status: string, count: number}>} One row per status that has at least one task.
 */
function countTasksByStatus(projectId) {
  return db.prepare(
    'SELECT status, COUNT(*) as count FROM tasks WHERE project_id = ? GROUP BY status'
  ).all(projectId);
}

module.exports = { findAll, findById, insert, update, remove, countTasksByStatus };

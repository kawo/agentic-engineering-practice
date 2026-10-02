const { db } = require('../connection');

/**
 * @description Finds every tag, sorted by name.
 * @returns {Object[]} The tag rows.
 */
function findAll() {
  return db.prepare('SELECT * FROM tags ORDER BY name ASC').all();
}

/**
 * @description Finds one tag by ID.
 * @param {number} id - The ID of the tag.
 * @returns {Object|undefined} The tag row, or `undefined` if none exists.
 */
function findById(id) {
  return db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
}

/**
 * @description Inserts a tag.
 * @param {string} name - The name of the tag, which must be unique.
 * @returns {number} The ID of the new tag.
 */
function insert(name) {
  return db.prepare('INSERT INTO tags (name) VALUES (?)').run(name).lastInsertRowid;
}

/**
 * @description Finds every tag applied to a task.
 * @param {number} taskId - The ID of the task.
 * @returns {Object[]} The tag rows.
 */
function findByTaskId(taskId) {
  return db.prepare(
    'SELECT t.* FROM tags t JOIN task_tags tt ON tt.tag_id = t.id WHERE tt.task_id = ?'
  ).all(taskId);
}

/**
 * @description Applies a tag to a task.
 * @param {number} taskId - The ID of the task.
 * @param {number} tagId - The ID of the tag.
 * @returns {void} Nothing.
 */
function addToTask(taskId, tagId) {
  db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)').run(taskId, tagId);
}

/**
 * @description Removes a tag from a task.
 * @param {number} taskId - The ID of the task.
 * @param {number} tagId - The ID of the tag.
 * @returns {number} The number of rows deleted: `1` if the tag was applied, otherwise `0`.
 */
function removeFromTask(taskId, tagId) {
  return db.prepare('DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?').run(taskId, tagId).changes;
}

module.exports = { findAll, findById, insert, findByTaskId, addToTask, removeFromTask };

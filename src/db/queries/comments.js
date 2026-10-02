const { db } = require('../connection');

/**
 * @description Finds every comment on a task, oldest first, with the author's name.
 * @param {number} taskId - The ID of the task.
 * @returns {Object[]} The comment rows, each with a `user_name` field.
 */
function findByTaskId(taskId) {
  return db.prepare(
    'SELECT c.*, u.name as user_name FROM comments c JOIN users u ON u.id = c.user_id WHERE c.task_id = ? ORDER BY c.created_at ASC'
  ).all(taskId);
}

/**
 * @description Finds one comment by ID, with the author's name.
 * @param {number} id - The ID of the comment.
 * @returns {Object|undefined} The comment row with a `user_name` field, or `undefined` if none exists.
 */
function findById(id) {
  return db.prepare(
    'SELECT c.*, u.name as user_name FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?'
  ).get(id);
}

/**
 * @description Inserts a comment on a task.
 * @param {Object} comment - The comment to insert.
 * @param {number} comment.task_id - The ID of the task the comment belongs to.
 * @param {number} comment.user_id - The ID of the user who wrote the comment.
 * @param {string} comment.body - The text of the comment.
 * @returns {number} The ID of the new comment.
 */
function insert({ task_id, user_id, body }) {
  return db.prepare(
    'INSERT INTO comments (task_id, user_id, body) VALUES (?, ?, ?)'
  ).run(task_id, user_id, body).lastInsertRowid;
}

module.exports = { findByTaskId, findById, insert };

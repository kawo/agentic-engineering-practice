const commentsQueries = require('../db/queries/comments');
const tasksQueries = require('../db/queries/tasks');
const usersQueries = require('../db/queries/users');
const { HttpError } = require('../utils/http-error');
const { isNonEmptyString } = require('../utils/validation');

function assertTaskExists(taskId) {
  if (!tasksQueries.findById(taskId)) throw new HttpError(404, 'Task not found');
}

/**
 * @description Lists the comments on a task, oldest first.
 * @param {number} taskId - The ID of the task.
 * @returns {Object[]} The comments, each with a `user_name` field. Throws `HttpError` 404 if the task does not exist.
 */
function listComments(taskId) {
  assertTaskExists(taskId);
  return commentsQueries.findByTaskId(taskId);
}

/**
 * @description Validates and adds a comment to a task.
 * @param {number} taskId - The ID of the task.
 * @param {Object} data - The request body.
 * @param {number|string} data.user_id - The ID of the author, who must exist.
 * @param {string} data.body - The text of the comment, which must not be empty.
 * @returns {Object} The new comment with a `user_name` field. Throws `HttpError` 404 if the task does not exist, or 400 if the input is invalid.
 */
function addComment(taskId, { user_id, body }) {
  assertTaskExists(taskId);
  if (!body || !isNonEmptyString(body)) throw new HttpError(400, 'body is required');
  if (!user_id) throw new HttpError(400, 'user_id is required');
  if (!usersQueries.findById(parseInt(user_id))) throw new HttpError(400, 'user not found');

  const id = commentsQueries.insert({ task_id: taskId, user_id: parseInt(user_id), body });
  return commentsQueries.findById(id);
}

module.exports = { listComments, addComment };

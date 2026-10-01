const commentsQueries = require('../db/queries/comments');
const tasksQueries = require('../db/queries/tasks');
const usersQueries = require('../db/queries/users');
const { HttpError } = require('../utils/http-error');
const { isNonEmptyString } = require('../utils/validation');

function assertTaskExists(taskId) {
  if (!tasksQueries.findById(taskId)) throw new HttpError(404, 'Task not found');
}

function listComments(taskId) {
  assertTaskExists(taskId);
  return commentsQueries.findByTaskId(taskId);
}

function addComment(taskId, { user_id, body }) {
  assertTaskExists(taskId);
  if (!body || !isNonEmptyString(body)) throw new HttpError(400, 'body is required');
  if (!user_id) throw new HttpError(400, 'user_id is required');
  if (!usersQueries.findById(parseInt(user_id))) throw new HttpError(400, 'user not found');

  const id = commentsQueries.insert({ task_id: taskId, user_id: parseInt(user_id), body });
  return commentsQueries.findById(id);
}

module.exports = { listComments, addComment };

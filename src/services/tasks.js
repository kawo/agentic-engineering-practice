const tasksQueries = require('../db/queries/tasks');
const projectsQueries = require('../db/queries/projects');
const usersQueries = require('../db/queries/users');
const commentsQueries = require('../db/queries/comments');
const tagsQueries = require('../db/queries/tags');
const { HttpError } = require('../utils/http-error');
const { isNonEmptyString } = require('../utils/validation');
const { VALID_TASK_STATUSES, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('../utils/constants');

function assertValidStatus(status) {
  if (status && !VALID_TASK_STATUSES.includes(status)) {
    throw new HttpError(400, `status must be one of: ${VALID_TASK_STATUSES.join(', ')}`);
  }
}

function findTaskOrThrow(id) {
  const task = tasksQueries.findById(id);
  if (!task) throw new HttpError(404, 'Task not found');
  return task;
}

/**
 * @description Lists one page of tasks, newest first, matching the given query filters.
 * @param {Object} query - The query string parameters.
 * @param {string} [query.status] - Only return tasks with this status, which must be valid.
 * @param {string} [query.project_id] - Only return tasks in this project.
 * @param {string} [query.assignee_id] - Only return tasks assigned to this user.
 * @param {string} [query.page] - The page number, starting at 1 (default 1).
 * @param {string} [query.page_size] - The page size (default `DEFAULT_PAGE_SIZE`, at most `MAX_PAGE_SIZE`).
 * @returns {Object[]} The tasks. Throws `HttpError` 400 if the status is invalid.
 */
function listTasks({ status, project_id, assignee_id, page, page_size }) {
  assertValidStatus(status);

  const limit = Math.min(MAX_PAGE_SIZE, parseInt(page_size) || DEFAULT_PAGE_SIZE);
  const offset = ((parseInt(page) || 1) - 1) * limit;

  return tasksQueries.findMany({
    status: status || undefined,
    projectId: project_id ? parseInt(project_id) : undefined,
    assigneeId: assignee_id ? parseInt(assignee_id) : undefined,
    limit,
    offset
  });
}

/**
 * @description Validates and creates a task.
 * @param {Object} data - The request body.
 * @param {string} data.title - The title of the task, which must not be empty.
 * @param {string} [data.description] - The description of the task.
 * @param {number|string} [data.project_id] - The ID of an existing project.
 * @param {number|string} [data.assignee_id] - The ID of an existing user.
 * @param {string} [data.due_date] - The due date.
 * @returns {Object} The new task. Throws `HttpError` 400 if the title is missing or the project or assignee does not exist.
 */
function createTask({ title, description, project_id, assignee_id, due_date }) {
  if (!title || !isNonEmptyString(title)) throw new HttpError(400, 'title is required');
  if (project_id && !projectsQueries.findById(parseInt(project_id))) {
    throw new HttpError(400, 'project not found');
  }
  if (assignee_id && !usersQueries.findById(parseInt(assignee_id))) {
    throw new HttpError(400, 'assignee not found');
  }
  const id = tasksQueries.insert({
    title,
    description: description || null,
    project_id: project_id ? parseInt(project_id) : null,
    assignee_id: assignee_id ? parseInt(assignee_id) : null,
    due_date: due_date || null
  });
  return tasksQueries.findById(id);
}

/**
 * @description Gets a task with its tags and comments.
 * @param {number} id - The ID of the task.
 * @returns {Object} The task with `tags` and `comments` arrays. Throws `HttpError` 404 if the task does not exist.
 */
function getTask(id) {
  const task = findTaskOrThrow(id);
  task.tags = tagsQueries.findByTaskId(id);
  task.comments = commentsQueries.findByTaskId(id);
  return task;
}

/**
 * @description Updates the fields given in `data`, keeps the others, and sets or clears `completed_at` when the status changes.
 * @param {number} id - The ID of the task.
 * @param {Object} data - The fields to change: any of `title`, `description`, `status`, `project_id`, `assignee_id` and `due_date`.
 * @returns {Object} The updated task. Throws `HttpError` 404 if the task does not exist, or 400 if the status is invalid.
 */
function updateTask(id, data) {
  const existing = findTaskOrThrow(id);
  const { title, description, status, project_id, assignee_id, due_date } = data;
  assertValidStatus(status);

  const updatedStatus = status !== undefined ? status : existing.status;
  const completedAt = updatedStatus === 'completed' && existing.status !== 'completed'
    ? new Date().toISOString()
    : (updatedStatus !== 'completed' ? null : existing.completed_at);

  tasksQueries.update(id, {
    title: title !== undefined ? title : existing.title,
    description: description !== undefined ? description : existing.description,
    status: updatedStatus,
    project_id: project_id !== undefined ? project_id : existing.project_id,
    assignee_id: assignee_id !== undefined ? assignee_id : existing.assignee_id,
    due_date: due_date !== undefined ? due_date : existing.due_date,
    completed_at: completedAt
  });
  return tasksQueries.findById(id);
}

/**
 * @description Deletes a task.
 * @param {number} id - The ID of the task.
 * @returns {{deleted: boolean}} `{ deleted: true }`. Throws `HttpError` 404 if the task does not exist.
 */
function deleteTask(id) {
  if (tasksQueries.remove(id) === 0) throw new HttpError(404, 'Task not found');
  return { deleted: true };
}

module.exports = { listTasks, createTask, getTask, updateTask, deleteTask };

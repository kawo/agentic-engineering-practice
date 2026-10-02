const { db } = require('../connection');

/**
 * @description Finds one page of tasks, newest first, matching the given filters.
 * @param {Object} filters - The filters and paging options.
 * @param {string} [filters.status] - Only return tasks with this status.
 * @param {number} [filters.projectId] - Only return tasks in this project.
 * @param {number} [filters.assigneeId] - Only return tasks assigned to this user.
 * @param {number} filters.limit - The maximum number of tasks to return.
 * @param {number} filters.offset - The number of matching tasks to skip.
 * @returns {Object[]} The task rows.
 */
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

/**
 * @description Finds one task by ID.
 * @param {number} id - The ID of the task.
 * @returns {Object|undefined} The task row, or `undefined` if none exists.
 */
function findById(id) {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}

/**
 * @description Inserts a task with the default status.
 * @param {Object} task - The task to insert.
 * @param {string} task.title - The title of the task.
 * @param {?string} task.description - The description of the task, or `null`.
 * @param {?number} task.project_id - The ID of the project, or `null`.
 * @param {?number} task.assignee_id - The ID of the assigned user, or `null`.
 * @param {?string} task.due_date - The due date, or `null`.
 * @returns {number} The ID of the new task.
 */
function insert({ title, description, project_id, assignee_id, due_date }) {
  return db.prepare(
    'INSERT INTO tasks (title, description, project_id, assignee_id, due_date) VALUES (?, ?, ?, ?, ?)'
  ).run(title, description, project_id, assignee_id, due_date).lastInsertRowid;
}

/**
 * @description Overwrites every editable field of a task.
 * @param {number} id - The ID of the task.
 * @param {Object} fields - The new values.
 * @param {string} fields.title - The new title.
 * @param {?string} fields.description - The new description, or `null`.
 * @param {string} fields.status - The new status.
 * @param {?number} fields.project_id - The ID of the new project, or `null`.
 * @param {?number} fields.assignee_id - The ID of the new assignee, or `null`.
 * @param {?string} fields.due_date - The new due date, or `null`.
 * @param {?string} fields.completed_at - When the task was completed, or `null`.
 * @returns {void} Nothing.
 */
function update(id, { title, description, status, project_id, assignee_id, due_date, completed_at }) {
  db.prepare(
    'UPDATE tasks SET title=?, description=?, status=?, project_id=?, assignee_id=?, due_date=?, completed_at=? WHERE id=?'
  ).run(title, description, status, project_id, assignee_id, due_date, completed_at, id);
}

/**
 * @description Deletes a task by ID.
 * @param {number} id - The ID of the task.
 * @returns {number} The number of rows deleted: `1` if the task existed, otherwise `0`.
 */
function remove(id) {
  return db.prepare('DELETE FROM tasks WHERE id = ?').run(id).changes;
}

module.exports = { findMany, findById, insert, update, remove };

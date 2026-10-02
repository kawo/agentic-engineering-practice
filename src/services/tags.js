const tagsQueries = require('../db/queries/tags');
const tasksQueries = require('../db/queries/tasks');
const { HttpError } = require('../utils/http-error');
const { isNonEmptyString } = require('../utils/validation');

function isUniqueViolation(err) {
  return err.message && err.message.includes('UNIQUE');
}

/**
 * @description Lists every tag, sorted by name.
 * @returns {Object[]} The tags.
 */
function listTags() {
  return tagsQueries.findAll();
}

/**
 * @description Validates and creates a tag, stored in lowercase with surrounding whitespace trimmed.
 * @param {Object} data - The request body.
 * @param {string} data.name - The name of the tag, which must not be empty.
 * @returns {Object} The new tag. Throws `HttpError` 400 if the name is missing, or 409 if the tag already exists.
 */
function createTag({ name }) {
  if (!name || !isNonEmptyString(name)) throw new HttpError(400, 'name is required');
  let id;
  try {
    id = tagsQueries.insert(name.toLowerCase().trim());
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'tag already exists');
    throw err;
  }
  return tagsQueries.findById(id);
}

/**
 * @description Applies an existing tag to an existing task.
 * @param {number} taskId - The ID of the task.
 * @param {Object} data - The request body.
 * @param {number|string} data.tag_id - The ID of the tag.
 * @returns {{task_id: number, tag_id: number}} The task and tag IDs. Throws `HttpError` 404 if the task or tag does not exist, 400 if `tag_id` is missing, or 409 if the tag is already applied.
 */
function addTagToTask(taskId, { tag_id }) {
  if (!tasksQueries.findById(taskId)) throw new HttpError(404, 'Task not found');
  if (!tag_id) throw new HttpError(400, 'tag_id is required');
  const tagId = parseInt(tag_id);
  if (!tagsQueries.findById(tagId)) throw new HttpError(404, 'Tag not found');

  try {
    tagsQueries.addToTask(taskId, tagId);
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'tag already applied to this task');
    throw err;
  }
  return { task_id: taskId, tag_id: tagId };
}

/**
 * @description Removes a tag from a task.
 * @param {number} taskId - The ID of the task.
 * @param {number} tagId - The ID of the tag.
 * @returns {{deleted: boolean}} `{ deleted: true }`. Throws `HttpError` 404 if the tag is not applied to the task.
 */
function removeTagFromTask(taskId, tagId) {
  if (tagsQueries.removeFromTask(taskId, tagId) === 0) {
    throw new HttpError(404, 'Tag not applied to this task');
  }
  return { deleted: true };
}

module.exports = { listTags, createTag, addTagToTask, removeTagFromTask };

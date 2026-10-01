const tagsQueries = require('../db/queries/tags');
const tasksQueries = require('../db/queries/tasks');
const { HttpError } = require('../utils/http-error');
const { isNonEmptyString } = require('../utils/validation');

function isUniqueViolation(err) {
  return err.message && err.message.includes('UNIQUE');
}

function listTags() {
  return tagsQueries.findAll();
}

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

function removeTagFromTask(taskId, tagId) {
  if (tagsQueries.removeFromTask(taskId, tagId) === 0) {
    throw new HttpError(404, 'Tag not applied to this task');
  }
  return { deleted: true };
}

module.exports = { listTags, createTag, addTagToTask, removeTagFromTask };

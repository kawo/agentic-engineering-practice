const projectsQueries = require('../db/queries/projects');
const { HttpError } = require('../utils/http-error');
const { isNonEmptyString } = require('../utils/validation');

/**
 * @description Lists every project, newest first.
 * @returns {Object[]} The projects.
 */
function listProjects() {
  return projectsQueries.findAll();
}

function findProjectOrThrow(id) {
  const project = projectsQueries.findById(id);
  if (!project) throw new HttpError(404, 'Project not found');
  return project;
}

/**
 * @description Validates and creates a project.
 * @param {Object} data - The request body.
 * @param {string} data.name - The name of the project, which must not be empty.
 * @param {string} [data.description] - The description of the project.
 * @param {number} [data.owner_id] - The ID of the user who owns the project.
 * @returns {Object} The new project. Throws `HttpError` 400 if the name is missing.
 */
function createProject({ name, description, owner_id }) {
  if (!name || !isNonEmptyString(name)) throw new HttpError(400, 'name is required');
  const id = projectsQueries.insert({
    name,
    description: description || null,
    owner_id: owner_id || null
  });
  return projectsQueries.findById(id);
}

/**
 * @description Gets a project with a count of its tasks by status.
 * @param {number} id - The ID of the project.
 * @returns {Object} The project with a `stats` field holding `total`, `active`, `completed` and `archived` counts. Throws `HttpError` 404 if the project does not exist.
 */
function getProjectWithStats(id) {
  const project = findProjectOrThrow(id);
  const stats = { total: 0, active: 0, completed: 0, archived: 0 };
  for (const row of projectsQueries.countTasksByStatus(id)) {
    stats[row.status] = row.count;
    stats.total += row.count;
  }
  return { ...project, stats };
}

/**
 * @description Updates the fields given in `data` and keeps the others.
 * @param {number} id - The ID of the project.
 * @param {Object} data - The fields to change: any of `name`, `description` and `owner_id`.
 * @returns {Object} The updated project. Throws `HttpError` 404 if the project does not exist.
 */
function updateProject(id, data) {
  const existing = findProjectOrThrow(id);
  projectsQueries.update(id, {
    name: data.name !== undefined ? data.name : existing.name,
    description: data.description !== undefined ? data.description : existing.description,
    owner_id: data.owner_id !== undefined ? data.owner_id : existing.owner_id
  });
  return projectsQueries.findById(id);
}

/**
 * @description Deletes a project.
 * @param {number} id - The ID of the project.
 * @returns {{deleted: boolean}} `{ deleted: true }`. Throws `HttpError` 404 if the project does not exist.
 */
function deleteProject(id) {
  if (projectsQueries.remove(id) === 0) throw new HttpError(404, 'Project not found');
  return { deleted: true };
}

module.exports = { listProjects, createProject, getProjectWithStats, updateProject, deleteProject };

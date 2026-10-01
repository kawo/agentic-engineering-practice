const projectsQueries = require('../db/queries/projects');
const { HttpError } = require('../utils/http-error');
const { isNonEmptyString } = require('../utils/validation');

function listProjects() {
  return projectsQueries.findAll();
}

function findProjectOrThrow(id) {
  const project = projectsQueries.findById(id);
  if (!project) throw new HttpError(404, 'Project not found');
  return project;
}

function createProject({ name, description, owner_id }) {
  if (!name || !isNonEmptyString(name)) throw new HttpError(400, 'name is required');
  const id = projectsQueries.insert({
    name,
    description: description || null,
    owner_id: owner_id || null
  });
  return projectsQueries.findById(id);
}

function getProjectWithStats(id) {
  const project = findProjectOrThrow(id);
  const stats = { total: 0, active: 0, completed: 0, archived: 0 };
  for (const row of projectsQueries.countTasksByStatus(id)) {
    stats[row.status] = row.count;
    stats.total += row.count;
  }
  return { ...project, stats };
}

function updateProject(id, data) {
  const existing = findProjectOrThrow(id);
  projectsQueries.update(id, {
    name: data.name !== undefined ? data.name : existing.name,
    description: data.description !== undefined ? data.description : existing.description,
    owner_id: data.owner_id !== undefined ? data.owner_id : existing.owner_id
  });
  return projectsQueries.findById(id);
}

function deleteProject(id) {
  if (projectsQueries.remove(id) === 0) throw new HttpError(404, 'Project not found');
  return { deleted: true };
}

module.exports = { listProjects, createProject, getProjectWithStats, updateProject, deleteProject };

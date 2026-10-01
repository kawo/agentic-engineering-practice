const express = require('express');
const projectsService = require('../services/projects');
const { authenticate } = require('../middleware/auth');

const projectsRouter = express.Router();

projectsRouter.get('/', (req, res) => {
  res.json(projectsService.listProjects());
});

projectsRouter.post('/', (req, res) => {
  res.status(201).json(projectsService.createProject(req.body));
});

projectsRouter.get('/:id', (req, res) => {
  res.json(projectsService.getProjectWithStats(parseInt(req.params.id)));
});

projectsRouter.put('/:id', (req, res) => {
  res.json(projectsService.updateProject(parseInt(req.params.id), req.body));
});

projectsRouter.delete('/:id', authenticate, (req, res) => {
  res.json(projectsService.deleteProject(parseInt(req.params.id)));
});

module.exports = { projectsRouter };

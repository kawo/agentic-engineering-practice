const express = require('express');
const tasksService = require('../services/tasks');

const tasksRouter = express.Router();

tasksRouter.get('/', (req, res) => {
  res.json(tasksService.listTasks(req.query));
});

tasksRouter.post('/', (req, res) => {
  res.status(201).json(tasksService.createTask(req.body));
});

tasksRouter.get('/:id', (req, res) => {
  res.json(tasksService.getTask(parseInt(req.params.id)));
});

tasksRouter.put('/:id', (req, res) => {
  res.json(tasksService.updateTask(parseInt(req.params.id), req.body));
});

tasksRouter.delete('/:id', (req, res) => {
  res.json(tasksService.deleteTask(parseInt(req.params.id)));
});

module.exports = { tasksRouter };

const express = require('express');
const tagsService = require('../services/tags');

// Mounted at /tags.
const tagsRouter = express.Router();

tagsRouter.get('/', (req, res) => {
  res.json(tagsService.listTags());
});

tagsRouter.post('/', (req, res) => {
  res.status(201).json(tagsService.createTag(req.body));
});

// Mounted at /tasks/:id/tags; mergeParams exposes the task id.
const taskTagsRouter = express.Router({ mergeParams: true });

taskTagsRouter.post('/', (req, res) => {
  res.status(201).json(tagsService.addTagToTask(parseInt(req.params.id), req.body));
});

taskTagsRouter.delete('/:tagId', (req, res) => {
  res.json(tagsService.removeTagFromTask(parseInt(req.params.id), parseInt(req.params.tagId)));
});

module.exports = { tagsRouter, taskTagsRouter };

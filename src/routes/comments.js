const express = require('express');
const commentsService = require('../services/comments');

// Mounted at /tasks/:id/comments; mergeParams exposes the task id.
const commentsRouter = express.Router({ mergeParams: true });

commentsRouter.get('/', (req, res) => {
  res.json(commentsService.listComments(parseInt(req.params.id)));
});

commentsRouter.post('/', (req, res) => {
  res.status(201).json(commentsService.addComment(parseInt(req.params.id), req.body));
});

module.exports = { commentsRouter };

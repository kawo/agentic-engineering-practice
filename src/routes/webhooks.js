const express = require('express');
const webhooksService = require('../services/webhooks');

const webhooksRouter = express.Router();

webhooksRouter.post('/task-update', (req, res) => {
  res.json(webhooksService.handleTaskUpdate(req.body));
});

module.exports = { webhooksRouter };

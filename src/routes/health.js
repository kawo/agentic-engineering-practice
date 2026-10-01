const express = require('express');

const healthRouter = express.Router();

healthRouter.get('/', (req, res) => {
  res.json({ name: 'Taskr API', version: '1.0.0', docs: '/health' });
});

healthRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = { healthRouter };

// Entry point for the Taskr API. Builds the Express app: parses JSON bodies,
// logs each request, mounts one router per resource, and sends errors to the
// central error handler, which must be mounted last. Starts listening on PORT
// only when run directly (npm start / npm run dev); tests require the
// exported app and call it with supertest instead.

const express = require('express');
const { PORT } = require('./utils/constants');
const { requestLogger } = require('./middleware/request-logger');
const { errorHandler } = require('./middleware/error-handler');
const { healthRouter } = require('./routes/health');
const { webhooksRouter } = require('./routes/webhooks');
const { usersRouter } = require('./routes/users');
const { projectsRouter } = require('./routes/projects');
const { tasksRouter } = require('./routes/tasks');
const { commentsRouter } = require('./routes/comments');
const { tagsRouter, taskTagsRouter } = require('./routes/tags');

const app = express();

app.use(express.json());
app.use(requestLogger);

app.use('/', healthRouter);
app.use('/webhooks', webhooksRouter);
app.use('/users', usersRouter);
app.use('/projects', projectsRouter);
app.use('/tasks', tasksRouter);
app.use('/tasks/:id/comments', commentsRouter);
app.use('/tags', tagsRouter);
app.use('/tasks/:id/tags', taskTagsRouter);

app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Taskr API running on port ${PORT}`);
  });
}

module.exports = app;

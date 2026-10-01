# Adding a new API endpoint to Taskr

Use this guide whenever you add an endpoint to the Taskr API. It describes the layout the codebase is moving to in the planned refactor. New endpoints should follow it now, so they don't need to be moved later.

## Current state vs. target

Most of the codebase does not follow these conventions yet. Existing routes live in the root-level `routes.js`, and the app is built in the root-level `index.js`. Do not use either file as a model, and do not add new route logic to `routes.js` (see "Never do these things" in `CLAUDE.md`).

If `src/index.js` does not exist yet, register the new router in the root `index.js` in the same way (step 4), and mention this in your summary so it can be moved during the refactor. Create `src/routes/` and `src/services/` if they don't exist.

## Steps

### 1. Create the route file in `src/routes/`

- Name the file after the resource, **lowercase plural**: `src/routes/comments.js`, `src/routes/tags.js`, `src/routes/projects.js`.
- One file per resource. Don't put two resources in one file.

### 2. Export a named Express Router

Create the router with `express.Router()` and export it by name as `<resource>Router`. Don't use a default export.

```js
const express = require('express');
const commentsService = require('../services/comments');

const commentsRouter = express.Router();

// ... route handlers ...

module.exports = { commentsRouter };
```

Paths inside the router are relative to where it is mounted. Use `'/'` and `'/:id'`, not `'/comments/:id'`.

### 3. Keep handlers thin: call a service function

Every route handler calls a matching function in `src/services/<resource>.js`. Business logic goes in the service: database queries, rules about state changes, side effects. The handler's job is only to:

1. read the request (`req.params`, `req.query`, `req.body`) and reject malformed input,
2. call the service function,
3. send the response with the right status code.

There should be no `db.prepare(...)` calls in a route file.

```js
// src/services/comments.js
const { db } = require('../../DB');

function listCommentsForTask(taskId) {
  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(taskId);
  if (!task) {
    const err = new Error('task not found');
    err.status = 404;
    throw err;
  }
  return db.prepare('SELECT * FROM comments WHERE task_id = ? ORDER BY created_at').all(taskId);
}

module.exports = { listCommentsForTask };
```

Name service functions after what they do (`listCommentsForTask`, `createComment`), and keep a one-to-one match with the handlers that call them.

### 4. Pass errors to `next` with a status and message

Don't send error responses from inside a handler with `res.status(...).json(...)`. Pass the error to Express's `next` with a status code and a message, and let the central `errorHandler` (from `middleware.js`, mounted last in the app) send the response:

```js
commentsRouter.get('/', (req, res, next) => {
  const taskId = Number(req.params.taskId);
  if (!Number.isInteger(taskId)) {
    return next({ status: 400, message: 'taskId must be an integer' });
  }
  try {
    res.json(commentsService.listCommentsForTask(taskId));
  } catch (err) {
    next({ status: err.status || 500, message: err.message });
  }
});
```

- Validation failures: `next({ status: 400, message: '...' })`, then `return`.
- Errors thrown by services carry a `.status`. Forward the status and message to `next`, defaulting to `500`.
- Use the same status codes the API uses elsewhere: `400` for invalid input, `401` for auth, `404` for a missing resource, `409` for conflicts such as unique constraints.

### 5. Register the router in `src/index.js`

Import the named router and mount it with `app.use`, using the resource path. Do this before the `errorHandler` is mounted.

```js
const { commentsRouter } = require('./routes/comments');

app.use('/comments', commentsRouter);
```

For a resource nested under another (for example `/tasks/:taskId/comments`), mount it at the full nested path, and create its router with `express.Router({ mergeParams: true })` so it can read the parent's params:

```js
app.use('/tasks/:taskId/comments', commentsRouter);
```

## Other things to keep in mind

- **Auth:** if the endpoint needs auth, add the `authenticate` middleware from `auth.js` to that route, as `DELETE /users/:id` does.
- **Schema changes:** if the endpoint needs a new table or column, change both `db/seed.js` and `tests/schema.js`.
- **Tests:** add tests in `tests/<resource>.test.js` (for example `tests/comments.test.js`), following the setup pattern in the Testing section of `CLAUDE.md`. Test the success path, every validation failure, and the not-found case.
- **Constants:** shared values such as `VALID_TASK_STATUSES` come from `misc/constants.js`. Never import from `misc/oldRoutes.js` or `misc/temp.js`.

## Checklist

- [ ] `src/routes/<resource>.js` exists, lowercase plural, one resource
- [ ] Exports `{ <resource>Router }`, a named Express Router
- [ ] Every handler calls a function in `src/services/<resource>.js`. No SQL or business rules in the handler
- [ ] Errors go to `next({ status, message })`. No `res.status(4xx/5xx).json(...)` in handlers
- [ ] Router mounted in `src/index.js` with `app.use('/<resource>', <resource>Router)`, before `errorHandler` (or in root `index.js` if `src/index.js` doesn't exist yet, and say so)
- [ ] Tests added in `tests/<resource>.test.js`
- [ ] Nothing new added to `routes.js`

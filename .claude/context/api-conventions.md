# Adding a new API endpoint to Taskr

Use this guide whenever you add or change an endpoint in the Taskr API. Every existing resource follows it. Use `src/routes/comments.js`, `src/services/comments.js` and `src/db/queries/comments.js` as a small, complete reference.

An endpoint touches three layers, and each layer only calls the one below it:

```
src/routes/<resource>.js      parse the request, call a service, send the response
src/services/<resource>.js    validation and business rules; throws HttpError
src/db/queries/<resource>.js  SQL only
```

For an endpoint on an existing resource, add to that resource's three files. For a new resource, create all three, plus the steps below.

## Steps

### 1. Add the SQL to `src/db/queries/<resource>.js`

- Name the file after the resource, **lowercase plural** (`attachments.js`).
- Each function runs one statement and returns plain data: rows, a row, `lastInsertRowid` or `changes`.
- No validation and no `HttpError` here. Query modules require only `../connection`.

```js
const { db } = require('../connection');

function findByTaskId(taskId) {
  return db.prepare('SELECT * FROM attachments WHERE task_id = ? ORDER BY created_at ASC').all(taskId);
}

function insert({ task_id, url }) {
  return db.prepare('INSERT INTO attachments (task_id, url) VALUES (?, ?)').run(task_id, url).lastInsertRowid;
}

module.exports = { findByTaskId, insert };
```

### 2. Put the logic in `src/services/<resource>.js`

The service validates input, checks that referenced records exist, applies business rules and calls queries. It may require any query module, `utils/` and other services such as `services/email.js`. It never requires a route file.

When something is wrong, **throw `HttpError(status, message)`**:

```js
const attachmentsQueries = require('../db/queries/attachments');
const tasksQueries = require('../db/queries/tasks');
const { HttpError } = require('../utils/http-error');
const { isNonEmptyString } = require('../utils/validation');

function addAttachment(taskId, { url }) {
  if (!tasksQueries.findById(taskId)) throw new HttpError(404, 'Task not found');
  if (!url || !isNonEmptyString(url)) throw new HttpError(400, 'url is required');
  const id = attachmentsQueries.insert({ task_id: taskId, url });
  return attachmentsQueries.findById(id);
}

module.exports = { addAttachment };
```

- Use the status codes the API uses elsewhere: `400` for invalid input, `401` for auth, `404` for a missing resource, `409` for conflicts.
- To turn a database constraint error into a 409, catch it in the service and re-throw an `HttpError`. Re-throw anything else unchanged. See `createTag` in `services/tags.js`.
- Name service functions after what they do (`listComments`, `addComment`), with one function per route handler.

### 3. Keep the route handler thin

In `src/routes/<resource>.js`, a handler only:

1. reads the request: `parseInt` the path ids, and pass `req.body` or `req.query` through,
2. calls one service function,
3. sends the result with the right success status (`res.json(...)` or `res.status(201).json(...)`).

No SQL, no validation, no `try/catch` and no error responses. Express 5 sends anything thrown in a handler, or a rejected promise from an `async` handler, to the error handler.

```js
const express = require('express');
const attachmentsService = require('../services/attachments');

// Mounted at /tasks/:id/attachments; mergeParams exposes the task id.
const attachmentsRouter = express.Router({ mergeParams: true });

attachmentsRouter.post('/', (req, res) => {
  res.status(201).json(attachmentsService.addAttachment(parseInt(req.params.id), req.body));
});

module.exports = { attachmentsRouter };
```

- Export the router **by name** as `<resource>Router`. Don't use a default export. A file may export two routers when one resource has both a top-level and a nested path (see `routes/tags.js`).
- Paths inside the router are relative to where it is mounted. Use `'/'` and `'/:id'`.
- For auth, add `authenticate` from `../middleware/auth` to the route, as `DELETE /users/:id` does.

### 4. Register the router in `src/index.js`

Require the named router and mount it with `app.use`, using the resource path, before `app.use(errorHandler)`:

```js
const { attachmentsRouter } = require('./routes/attachments');

app.use('/tasks/:id/attachments', attachmentsRouter);
```

Nested resources are mounted at their full path, and their router is created with `express.Router({ mergeParams: true })`. Without it, `req.params.id` is undefined.

## Other things to keep in mind

- **Schema changes:** add tables and columns in `src/db/schema.js` only. It is used by both the seed script and the tests. Add sample data in `src/db/seed.js` if it helps.
- **Constants:** shared values such as `VALID_TASK_STATUSES` and the page sizes live in `src/utils/constants.js`.
- **Naming:** all new files use lowercase kebab-case.
- **Tests:** add or extend `tests/<resource>.test.js` following `.claude/context/testing-standards.md`.
- **Behaviour:** don't change an existing endpoint's responses or error messages unless the task asks for it. The tests pin them, and so does the list of known quirks in `CLAUDE.md`.

## Checklist

- [ ] SQL only in `src/db/queries/<resource>.js`
- [ ] Validation and rules in `src/services/<resource>.js`. Errors thrown as `HttpError(status, message)`
- [ ] Handlers in `src/routes/<resource>.js` only parse, call one service function and send the success response. No `try/catch`, no error responses
- [ ] Router exported as `{ <resource>Router }` and mounted in `src/index.js` before `errorHandler` (`mergeParams: true` if nested)
- [ ] Schema changes only in `src/db/schema.js`
- [ ] Tests added in `tests/<resource>.test.js`, and `npm test` passes

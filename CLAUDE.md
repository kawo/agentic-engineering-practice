# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Taskr is a REST API for task management: users, projects, tasks, comments and tags. Built with Node.js, Express 5, SQLite (`better-sqlite3`, synchronous) and Jest + supertest. There is no build step, linter or TypeScript.

## Context Files

Before starting a task, read the context file that matches it, and follow it:

- **`.claude/context/api-conventions.md`**: any task involving API routes or endpoints (adding, changing or moving a route, or the handler, service or query code behind it).
- **`.claude/context/testing-standards.md`**: any task involving tests or test coverage (writing, fixing or extending tests, or checking coverage).

If a task involves both, such as adding an endpoint together with its tests, read both.

## Commands

```bash
npm install
npm run db:seed        # create schema + sample data in taskr.db (skips if users already exist)
npm run db:reset       # delete taskr.db and re-seed (uses `rm -f`, so needs a POSIX shell)
npm run dev            # start with node --watch on port 3000 (PORT env overrides)
npm start
npm test               # run all tests
npx jest tests/users.test.js                   # run one test file
npx jest tests/tasks.test.js -t "filters by"   # run tests whose name matches
```

Jest runs every file matching `tests/*.test.js`.

## Architecture

```
src/
  index.js              builds the app, mounts every router, exports the app
  routes/               one Express router per resource; parse the request, call a service, send the response
  services/             business logic and validation; throw HttpError for client errors
  db/
    connection.js       the shared better-sqlite3 connection
    schema.js           createSchema(db): the only definition of the schema
    seed.js             sample data for taskr.db (npm run db:seed)
    queries/            all SQL, one module per resource
  middleware/           auth, request-logger, error-handler
  utils/                http-error, constants, validation
tests/                  <resource>.test.js, run against an in-memory database
```

- **Layers:** routes call services, services call queries. Routes require only services (and `middleware/auth.js`). Services may require any query module, `utils/` and other services such as `services/email.js`. Query modules require only `db/connection.js`. Nothing except `src/index.js` requires a route file.
- **Entry point:** `src/index.js` builds the Express app and exports it. It only calls `listen` when run directly, so tests import it with supertest. Routers are mounted with `app.use('/<resource>', <resource>Router)`. Nested resources are mounted at their full path, with `mergeParams: true` (`/tasks/:id/comments` and `/tasks/:id/tags`).
- **Errors:** services throw `HttpError(status, message)` from `utils/http-error.js`. Express 5 forwards thrown errors and rejected promises to `middleware/error-handler.js`, which responds with `{ error: message }` and the error's status (500 if it has none, logging the stack). Route handlers have no `try/catch`.
- **Database:** `db/connection.js` uses `:memory:` when `NODE_ENV=test`, otherwise `DB_PATH` or `taskr.db`. Foreign keys and WAL mode are on.
- **Auth:** `middleware/auth.js` checks the `x-api-key` header against `API_KEY` (default `dev-key`). It is applied only to `DELETE /users/:id` and `DELETE /projects/:id`.
- **Task status:** must be one of `VALID_TASK_STATUSES` in `utils/constants.js` (`active`, `completed`, `archived`), also enforced by a SQL `CHECK`. `PUT /tasks/:id` sets `completed_at` when a task moves to `completed` and clears it when it leaves.
- **Stubs:** `services/email.js` only logs (it's called when a user is created). `services/webhooks.js` only logs the payload.

## Known API quirks, kept on purpose

The refactor into `src/` did not change any API behaviour, including these. Tests pin them. Don't "fix" them as a side effect of another change. Change them only when asked, and update the tests in the same change.

- `POST /tasks` returns **400** (not 404) for an unknown `project_id` or `assignee_id`.
- `PUT /users/:id` with an email that belongs to another user returns **500**, not 409.
- Deleting a user or project that tasks still reference returns **500** (the foreign key rejects it).
- `PUT /tasks/:id` doesn't check that a new `project_id` or `assignee_id` exists.

## Never do these things

- **Never put SQL outside `src/db/queries/`.** Routes and services don't call `db.prepare`.
- **Never put business logic or validation in a route handler.** It belongs in the service.
- **Never send an error response from a route handler.** Throw `HttpError` from the service and let the error handler respond.
- **Never require a route file from anywhere except `src/index.js`.** That is what keeps the dependency graph one-way.
- **Never define the schema anywhere except `src/db/schema.js`.**
- **Never add a catch-all helper module.** Put a helper in the most specific module that fits. `utils/` is only for code used across resources.

## Naming

All files and folders under `src/` and `tests/` use lowercase kebab-case (`error-handler.js`, `http-error.js`). Inside `routes/`, `services/` and `db/queries/`, files are named after the resource in lowercase plural (`tasks.js`), and the folder says which layer it is. Routers are exported by name as `<resource>Router`.

## Testing

Each test file sets `process.env.NODE_ENV = 'test'` **before** requiring `src/index.js` or `src/db/connection.js`, which makes the database in-memory. It then calls `createSchema(db)` from `src/db/schema.js` in `beforeAll` and clears every table in `beforeEach`. Follow the same pattern in new test files. Tests don't need a seeded `taskr.db`. See `.claude/context/testing-standards.md` for the full standards.

## Custom commands

`.claude/commands/` has `/commit-push`, `/commit-push-pr`, `/git-branch` and `/verify-app`. `/commit-push` and `/git-branch` stage everything with `git add -A`. `/verify-app` runs the full test suite serially (`npm test -- --runInBand`) and fixes the implementation, never the tests, until everything passes. Run it after any significant change. `.gitignore` keeps `node_modules/` and the `taskr.db` files out.

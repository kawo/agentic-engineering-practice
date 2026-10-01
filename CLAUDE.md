# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Taskr is a REST API for task management: users, projects, tasks, comments and tags. Built with Node.js, Express 5, SQLite (`better-sqlite3`, synchronous) and Jest + supertest. There is no build step, linter or TypeScript.

## Context Files

Before starting a task, read the context file that matches it, and follow it:

- **`.claude/context/api-conventions.md`**: any task involving API routes or endpoints (adding, changing or moving a route, or the handler or service code behind it).
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
npx jest tests/userTest.js            # run one test file
npx jest tests/tasks.test.js -t "filters by"   # run tests whose name matches
```

Jest only picks up files matching `testMatch` in `package.json`: `tests/*.test.js`, `tests/userTest.js` and `tests/test-projects.js`. A new test file with any other name won't run unless it is named `*.test.js` or added to `testMatch`.

## Architecture

- **Entry point:** `index.js` builds the Express app and exports it (it only calls `listen` when run directly), so tests import it with supertest. A few routes (`/` and `POST /webhooks/task-update`) are defined in `index.js` itself rather than in `routes.js`.
- **Routing:** almost every route lives in the single router in `routes.js`. Most handlers validate input inline and query the database directly with `db.prepare(...)`. There is no service or repository layer.
- **Inconsistent layering:** only users go through `UserController.js` (which throws errors carrying a `.status` that the route turns into the HTTP code). Task reads go through `get-tasks.js`, and project stats through `projectHelpers.js`. Everything else is inline in `routes.js`.
- **Database:** `DB.js` exports one shared `db` connection. It uses `:memory:` when `NODE_ENV=test`, otherwise `DB_PATH` or `taskr.db`. Foreign keys and WAL mode are on.
- **Schema is defined twice:** in `db/seed.js` (for the real DB) and in `tests/schema.js` (for tests). Any schema change must be made in both.
- **Circular dependency:** `projectHelpers.formatProjectSummary` requires `routes.js`, which exports `getTasksForProject`. `routes.js` requires `projectHelpers` lazily inside the `GET /projects/:id` handler to avoid a load-time cycle. Keep those requires lazy.
- **Auth:** `auth.js` checks the `x-api-key` header against `API_KEY` (default `dev-key`). It is applied only to `DELETE /users/:id` and `DELETE /projects/:id`.
- **Task status:** must be one of `VALID_TASK_STATUSES` in `misc/constants.js` (`active`, `completed`, `archived`), also enforced by a SQL `CHECK`. `PUT /tasks/:id` sets `completed_at` when a task moves to `completed` and clears it when it leaves.
- **Stubs:** `sendEmail.js` only logs (it's called when a user is created). `misc/oldRoutes.js` and `misc/temp.js` are dead code and not loaded anywhere.

## Known structural problems (intentional, pending refactor)

This codebase has structural problems on purpose. A future refactor will fix them. Until then, understand the current state, but **do not copy these patterns into new code**. Existing code that reads like this is not a style guide.

- **God-file router:** `routes.js` holds almost every route for every resource (see the TODOs at the top of the file). New routes go in their own route file (see "Never do these things"). Don't move more routes into `index.js`.
- **No data-access layer:** handlers call `db.prepare(...)` inline. In new or changed code, keep SQL out of the route handler and put it in a function the handler calls.
- **Validation copied into each handler:** checks are repeated per route. Reuse the existing helpers in `utils.js` instead of writing another inline variant. Put new helpers in the most specific module that fits.
- **Inconsistent layering:** users go through a controller, tasks through `get-tasks.js`, project stats through `projectHelpers.js`, everything else inline. Don't add a fourth style. Follow the `UserController` pattern (logic outside the route, errors carry `.status`) and don't add more lookalike one-off helper modules.
- **Inconsistent error handling:** some handlers wrap their work in `try/catch` and format errors themselves, others don't, even though `index.js` mounts the central `errorHandler` from `middleware.js`. Prefer throwing errors with a `.status` and letting them reach the handler, rather than copying the per-route `try/catch` blocks.
- **Circular dependency** between `routes.js` and `projectHelpers.js`. Don't add new cross-requires between route and helper modules. Helpers should not require `routes.js`.
- **Inconsistent file naming:** `DB.js`, `UserController.js`, `get-tasks.js`, `projectHelpers.js`, plus a `misc/` grab-bag. Test files are also named inconsistently (`userTest.js`, `test-projects.js`). Name new source files in camelCase and new tests `<resource>.test.js` (see Testing). Don't put anything new in `misc/`.
- **Schema duplicated** in `db/seed.js` and `tests/schema.js`. Keep both in sync, and don't add a third copy.
- **Dead code** in `misc/oldRoutes.js` and `misc/temp.js`. Don't import it, extend it, or use it as a reference.

When a task touches one of these areas, make the change it asks for without doing the larger refactor on the side, unless asked. If following the existing pattern and following this guidance conflict, say so rather than picking one silently.

## Never do these things

- **Never add new route logic to `routes.js`.** It is already too large. New routes belong in a dedicated route file (e.g. one router per resource), mounted in `index.js`.
- **Never add a new utility function to `utils.js` without first checking whether it belongs in a more specific module.** `utils.js` is a catch-all. Only add to it when nothing more specific fits.
- **Never import from the dead files in `misc/` (`misc/oldRoutes.js`, `misc/temp.js`).** That code is dead and scheduled for removal. The one exception is `misc/constants.js`, which is still live (`index.js` and `routes.js` import `PORT` and `VALID_TASK_STATUSES` from it).

## Testing

Each test file sets `process.env.NODE_ENV = 'test'` **before** requiring `index.js`/`DB.js`, which makes the database in-memory. It then calls `createSchema(db)` from `tests/schema.js` in `beforeAll` and clears every table in `beforeEach`. Follow the same pattern in new test files. Tests don't need a seeded `taskr.db`.

Test files should be named `<resource>.test.js`, for example `tasks.test.js`, `projects.test.js` or `comments.test.js`. `tasks.test.js` already follows this. `userTest.js` and `test-projects.js` don't. That inconsistency is a known problem and will be standardised later, so don't copy those names, and don't rename them unless asked. Files named this way are picked up by the existing `tests/*.test.js` pattern in `testMatch`, so no `package.json` change is needed.

## Custom commands

`.claude/commands/` has `/commit-push`, `/commit-push-pr` and `/git-branch`. `/commit-push` and `/git-branch` stage everything with `git add -A`.

# Writing tests for the Taskr API

Use this guide whenever you write or extend tests for the Taskr API. It covers file naming, test setup, how much each test file must cover, and how to word test descriptions.

## Ground rules

- Tests use **Jest** and **supertest**, run against an **in-memory SQLite database**.
- The whole suite must run with **`npm test`** and nothing else: no seeded `taskr.db`, no running server, no environment variables to set by hand, no other services.
- Every test file covers the **happy path and at least two error cases for each endpoint** it tests.
- Test descriptions say **what the endpoint does**, in plain English, not how it is implemented.

## 1. File naming: `<resource>.test.js`

- Put test files in `tests/`, named after the resource, **lowercase**: `tests/tasks.test.js`, `tests/projects.test.js`, `tests/comments.test.js`, `tests/tags.test.js`.
- Use one file per resource, and put all of that resource's endpoints in it, including nested ones (`POST /tasks/:id/comments` goes in `comments.test.js`).
- Files named `*.test.js` in `tests/` match `testMatch` in `package.json`, so a new file runs under `npm test` without any config change. A file named any other way **will not run**.

## 2. Setup: in-memory database, no external dependencies

Every test file starts with the same setup. `tests/tasks.test.js` is the reference.

```js
process.env.NODE_ENV = 'test'; // must come before requiring the app or DB

const request = require('supertest');
const app = require('../src/index');
const { db } = require('../src/db/connection');
const { createSchema } = require('../src/db/schema');

beforeAll(() => {
  createSchema(db);
});

beforeEach(() => {
  db.exec('DELETE FROM task_tags; DELETE FROM comments; DELETE FROM tasks; DELETE FROM projects; DELETE FROM users; DELETE FROM tags;');
  // Insert only the fixture rows this file needs, e.g.:
  db.prepare('INSERT INTO users (id, name, email) VALUES (1, ?, ?)').run('Test User', 'test@example.com');
});
```

Why each piece matters:

- **`NODE_ENV = 'test'` first.** `src/db/connection.js` uses `:memory:` only when `NODE_ENV=test` is set at the moment it is first required. Jest sets `NODE_ENV=test` by default, but only when `NODE_ENV` isn't already set. Setting it explicitly in the file means tests can never write to the real `taskr.db`, whatever the shell environment.
- **`createSchema(db)` from `src/db/schema.js`** builds the tables. It is the same schema the seed script uses, so the tests always run against the real schema.
- **Clear every table in `beforeEach`**, in child-to-parent order (foreign keys are on). Each test then starts from a known, empty state and doesn't depend on the order tests run in.
- **Use supertest against the exported app** (`request(app)`). Never call `app.listen` or start a server in a test.
- **No external calls.** Anything that would reach outside the process must be a stub or a mock. `src/services/email.js` already only logs.

## 3. Coverage: happy path + at least two error cases per endpoint

Group tests with one `describe` block per endpoint, named by method and path:

```js
describe('POST /tasks', () => { ... });
describe('GET /tasks/:id', () => { ... });
```

Each block must contain:

1. **The happy path.** A valid request succeeds. Check the status code **and** the response body (the fields that matter, not only that it has a body). For writes, also check the effect, either with a follow-up request or by reading the row from `db`.
2. **At least two error cases.** Choose the ones that apply to the endpoint:
   - a missing required field (`400`)
   - an invalid value: wrong type, empty string, a status not in `VALID_TASK_STATUSES` (`400`)
   - an unknown id in the path, or a referenced id that doesn't exist (`404`)
   - a missing or wrong `x-api-key` on authenticated routes (`401`)
   - a uniqueness conflict, such as a duplicate email (`409`)

   For each error case, check the status code and that the body has an `error` message.

If an endpoint really has fewer than two possible errors (for example, an unfiltered `GET` list with no parameters), test the one that exists, or an edge case such as an empty list. Add a one-line comment saying why there is no second error case. Don't invent a fake one.

## 4. Test descriptions: what the endpoint does, in plain English

Write each `test(...)` description so it reads as a statement of how the API behaves. Someone who has never seen the code should understand it. Describe the observable result: the status, what comes back, what changes. Don't describe which function, table or query produces it.

| Good | Bad (implementation detail) |
| --- | --- |
| `creates a task and returns it with status active` | `inserts a row into the tasks table` |
| `returns 404 when the task does not exist` | `returns 404 when getTaskById returns undefined` |
| `returns 409 when the email is already registered` | `catches the UNIQUE constraint error` |
| `sets completed_at when a task is marked completed` | `calls the completed_at branch in the PUT handler` |
| `returns 400 when title is missing` | `fails validation` |

Field names and status codes that are part of the API response are fine to mention. Internal module names, function names, SQL and table names are not.

## Checklist

- [ ] File is `tests/<resource>.test.js`, lowercase, one resource per file
- [ ] `process.env.NODE_ENV = 'test'` is the first line
- [ ] `createSchema(db)` in `beforeAll`, every table cleared in `beforeEach`
- [ ] Requests go through `request(app)`. No server started, no external calls
- [ ] One `describe` per endpoint, named `METHOD /path`
- [ ] Each endpoint has a happy-path test that checks status and body
- [ ] Each endpoint has at least two error-case tests (or a comment explaining why there's only one)
- [ ] Descriptions read as plain-English API behaviour, with no function, table or SQL names
- [ ] `npm test` passes from a fresh clone after `npm install`, with no other steps

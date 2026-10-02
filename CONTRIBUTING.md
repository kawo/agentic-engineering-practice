# Contributing to Taskr

Thanks for helping out. This guide covers setting up a development environment, the commit message convention, running the tests, and the checks every change must pass before it is committed.

The architecture and coding rules live in [`CLAUDE.md`](CLAUDE.md), with more detail in [`.claude/context/api-conventions.md`](.claude/context/api-conventions.md) and [`.claude/context/testing-standards.md`](.claude/context/testing-standards.md). Read them before changing code.

---

## Setting up from scratch

### Prerequisites

- **Node.js 18 or later** (`npm run dev` uses `node --watch`). The project is developed on Node 24.
- **npm**, which comes with Node.
- **A POSIX shell** (macOS/Linux terminal, or Git Bash/WSL on Windows) if you want to use `npm run db:reset`, which runs `rm -f`.

There is no build step, linter, TypeScript or external database. SQLite runs in-process through `better-sqlite3`.

### Steps

```bash
git clone <repo-url> taskr
cd taskr
npm install
npm run db:seed
npm test
npm run dev
```

1. **`npm install`** installs Express, `better-sqlite3`, Jest and supertest. `better-sqlite3` builds a native module during install; `package.json` allows its install script.
2. **`npm run db:seed`** creates `taskr.db` with the schema and sample data (5 users, 3 projects, 20 tasks, 15 comments, 8 tags). It skips seeding if users already exist. Use `npm run db:reset` to delete the database and seed it again.
3. **`npm test`** runs the suite. It doesn't need the seeded database (see below), so it is a good check that the install worked.
4. **`npm run dev`** starts the server on port 3000 with file watching. Open `http://localhost:3000/health` to confirm it is running.

### Configuration

All environment variables are optional:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Port the server listens on |
| `DB_PATH` | `taskr.db` | SQLite database file |
| `API_KEY` | `dev-key` | Value expected in the `x-api-key` header on `DELETE /users/:id` and `DELETE /projects/:id` |
| `NODE_ENV` | (unset) | When `test`, the database is in-memory |

`taskr.db` and `node_modules/` are git-ignored.

---

## Running the tests

```bash
npm test                                       # run the whole suite
npm test -- --runInBand                        # run it serially (what /verify-app does)
npm run test:watch                             # re-run on file changes
npx jest tests/users.test.js                   # run one file
npx jest tests/tasks.test.js -t "filters by"   # run tests whose name matches
```

The tests use Jest and supertest against the exported Express app and an **in-memory SQLite database**. They don't need a running server, a seeded `taskr.db`, or any environment variables. `npm test` after `npm install` is enough.

Every file in `tests/` named `<resource>.test.js` runs automatically. A file named any other way won't run.

### What a passing run looks like

Jest prints a `PASS` line for each test file, then a summary. Every suite and every test should be reported as passed, with nothing failed or skipped:

```
PASS tests/comments.test.js
PASS tests/health.test.js
PASS tests/projects.test.js
PASS tests/tags.test.js
PASS tests/tasks.test.js
PASS tests/users.test.js
PASS tests/webhooks.test.js

Test Suites: 7 passed, 7 total
Tests:       94 passed, 94 total
Snapshots:   0 total
Time:        1.939 s
Ran all test suites.
```

The counts grow as tests are added; what matters is that the `passed` and `total` numbers match. You will also see `console.log` output between the results: the request logger, the email stub and the webhook stub all log. That is expected and doesn't mean anything failed. A failure shows as `FAIL tests/<file>` with the failing test, the expected and received values, and a non-zero exit code.

### Writing tests

Follow [`.claude/context/testing-standards.md`](.claude/context/testing-standards.md). In short: one file per resource, `process.env.NODE_ENV = 'test'` as the first line, `createSchema(db)` in `beforeAll`, clear every table in `beforeEach`, one `describe` per endpoint, and a happy path plus at least two error cases for each endpoint.

The tests pin the API's current behaviour, including the known quirks listed in [`CLAUDE.md`](CLAUDE.md#known-api-quirks-kept-on-purpose). Don't change a test to match new behaviour unless changing that behaviour is the point of your change.

---

## Verifying a change: `/verify-app`

`/verify-app` is a Claude Code slash command, defined in [`.claude/commands/verify-app.md`](.claude/commands/verify-app.md). It:

1. Runs the full suite serially with `npm test -- --runInBand`.
2. If anything fails, finds the cause in `src/` and fixes the **implementation**. It never edits, skips or deletes tests to make them pass; if it thinks a test is wrong, it stops and says why. It gives up and reports after three failed attempts at the same failure.
3. Reports either that all tests passed (with the test and file counts) and any fixes it made, or each remaining failure with what it tried.

**When to run it:** after any significant change, and always before committing. That includes new or changed endpoints, changes to services, queries, middleware or the schema, and refactors. Because the suite covers every endpoint through supertest, a passing run confirms the whole application works.

If you aren't using Claude Code, run `npm test -- --runInBand` yourself and fix the implementation until it passes.

---

## Never commit with failing tests

**Do not commit if any test is failing.** This applies to every commit, on every branch, not only before a merge.

- Run `/verify-app` (or `npm test -- --runInBand`) before each commit and make sure the summary shows every suite and test passing.
- If a test fails, fix the implementation. Don't skip, delete or weaken the test to get a green run.
- If you believe a test is wrong, raise it rather than changing it quietly. If the change is intended (for example, deliberately fixing one of the known API quirks), update the test in the same commit as the behaviour change.

---

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>
```

- Write the description in lowercase, in the imperative mood ("add", not "added"), with no trailing period.
- Keep it to one short line that says what the commit does. Add a body after a blank line if the reason isn't obvious.
- Keep each commit to one logical change.

The types used in this repository:

| Type | Use it for | Example |
| --- | --- | --- |
| `feat` | A new feature or endpoint | `feat: add due date filter to GET /tasks` |
| `fix` | A bug fix | `fix: return 404 for unknown task in PUT /tasks/:id` |
| `refactor` | Restructuring with no behaviour change | `refactor: extract tasks into routes, services and queries` |
| `test` | Adding or changing tests | `test: cover every endpoint before refactoring` |
| `docs` | Documentation, comments, JSDoc | `docs: add JSDoc to every exported function in src/` |
| `chore` | Tooling, config, dependencies, cleanup | `chore: add .gitignore and lockfile, allow better-sqlite3 install script` |

(The `feat` and `fix` rows are illustrative; the others are real commits.)

Branch names use the same types as a prefix, in kebab-case: `feat/add-login`, `fix/null-due-date`, `chore/update-deps`.

### Commit helpers

If you use Claude Code, `.claude/commands/` has commands that write Conventional Commits messages for you:

- **`/git-branch [name]`** creates and switches to a new branch, stages everything and commits.
- **`/commit-push`** stages everything, commits and pushes the current branch.
- **`/commit-push-pr`** commits what is already staged, pushes and opens a pull request with `gh`.

`/git-branch` and `/commit-push` stage with `git add -A`, so check `git status` for stray files first. None of them run the tests, so run `/verify-app` before using them.

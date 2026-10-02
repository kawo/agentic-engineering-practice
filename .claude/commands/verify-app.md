---
description: Run the full test suite, fix any failures, and report whether every endpoint is verified
allowed-tools: Bash(npm test:*), Bash(npx jest:*), Read, Grep, Glob, Edit
---

Run the full verification suite for Taskr. Use this after any significant change.

The test suite uses supertest to call every API endpoint directly against an in-memory database, so no server or seeded `taskr.db` is needed. If every test passes, the server and all endpoints are working.

Follow these steps in order:

1. Run `npm test -- --runInBand` to run the full test suite serially.
2. If every test passes, go to step 4.
3. If any test fails:
   - Read the failure output and find the cause in the implementation under `src/`.
   - Fix the implementation, following `CLAUDE.md` and `.claude/context/api-conventions.md`.
   - Do not edit, skip or delete tests to make them pass. The tests pin the API's behaviour, including the known quirks listed in `CLAUDE.md`. If you believe a test itself is wrong, stop and say why instead of changing it.
   - Run `npm test -- --runInBand` again. Repeat until all tests pass. If the same failure is still there after three fix attempts, stop and report it.
4. Report the result clearly:
   - **All passing:** say that all tests passed and all endpoints are verified, with the number of tests and test files from the Jest summary. List any fixes you made, with the files changed.
   - **Failures remaining:** list each failing test by file and name, the expected and actual result, what you think the cause is, and what you already tried.

---
description: Create and switch to a new branch, stage all changes, and commit them
argument-hint: [branch-name]
allowed-tools: Bash(git switch:*), Bash(git add:*), Bash(git status:*), Bash(git diff:*), Bash(git commit:*), Bash(git branch:*)
---

Create a new branch, switch to it, stage all changes, and commit them.

Follow these steps in order:

1. Pick the branch name. If one was given, use it: `$ARGUMENTS`. Otherwise, run `git status` and `git diff` to see what changed and choose a short kebab-case name with a Conventional Commits type prefix (e.g. `feat/add-login`, `fix/null-due-date`, `chore/update-deps`).
2. Run `git switch -c <branch-name>` to create the branch and switch to it. Uncommitted changes carry over to the new branch.
3. Run `git add -A` to stage all changes.
4. Run `git status` to show what will be committed.
5. Run `git diff --staged` to review the staged changes.
6. Write a commit message in Conventional Commits format (e.g. `feat: ...`, `fix: ...`, `refactor: ...`, `docs: ...`, `test: ...`, `chore: ...`) based on what was staged, and commit with `git commit -m "<message>"`.

If there are no changes to commit, stop and tell the user before creating the branch. If a branch with that name already exists, stop and tell the user instead of switching to it.

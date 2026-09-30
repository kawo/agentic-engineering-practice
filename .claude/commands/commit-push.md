---
description: Stage all changes, commit them, and push the current branch
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git diff:*), Bash(git commit:*), Bash(git push:*), Bash(git branch:*)
---

Stage all changes, commit them, and push them to the current branch.

Follow these steps in order:

1. Run `git add -A` to stage all changes.
2. Run `git status` to show what will be committed.
3. Run `git diff --staged` to review the staged changes.
4. Write a commit message in Conventional Commits format (e.g. `feat: ...`, `fix: ...`, `refactor: ...`, `docs: ...`, `test: ...`, `chore: ...`) based on what was staged, and commit with `git commit -m "<message>"`.
5. Run `git push origin <current-branch>`, using `git branch --show-current` to get the branch name.

If there is nothing to commit after staging, stop and tell the user instead of committing.

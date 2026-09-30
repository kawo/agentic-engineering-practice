---
description: Commit staged changes and push the current branch
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git commit:*), Bash(git push:*), Bash(git branch:*)
---

Commit all staged changes and push them to the current branch.

Follow these steps in order:

1. Run `git status` to show what will be committed.
2. Run `git diff --staged` to review the staged changes.
3. Write a commit message in Conventional Commits format (e.g. `feat: ...`, `fix: ...`, `refactor: ...`, `docs: ...`, `test: ...`, `chore: ...`) based on what was staged, and commit with `git commit -m "<message>"`.
4. Run `git push origin <current-branch>`, using `git branch --show-current` to get the branch name.

If nothing is staged, stop and tell the user instead of committing.

# Git Hooks for Claude Workflow

This folder is intended to be used as repository hooks path:

```bash
git config core.hooksPath .claude/4-hooks
```

Included hooks:

- `pre-commit`: validates structure and type-check.
- `commit-msg`: validates commit messages with commitlint (if available).
- `pre-push`: validates OpenAPI contract (if script exists).

All hooks are POSIX shell scripts and should be executable.

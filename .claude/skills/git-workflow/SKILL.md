---
name: git-workflow
description: Git branching strategy and versioning workflow. Use when creating branches, PRs, or releasing versions.
allowed-tools: Read, Bash, Grep, Glob
---

# Git Workflow

Manages branching strategy and semantic versioning with Changesets.

## Branch Strategy

```
main      ← stable releases (triggers npm publish)
  ↑
develop   ← integration branch (PRs go here)
  ↑
feature/* ← feature branches
fix/*     ← bugfix branches
```

## Workflow Steps

### 1. Starting New Work

```bash
# Always start from develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/<name>
# or
git checkout -b fix/<name>
```

### 2. Recording Changes

After completing work, record the change for versioning:

```bash
pnpm changeset
```

Select change type:
- `patch`: Bug fixes, minor changes (0.0.X)
- `minor`: New features, backwards compatible (0.X.0)
- `major`: Breaking changes (X.0.0)

Write a clear description of what changed.

### 3. Creating PR to develop

```bash
git add -A
git commit -m "<type>: <description>"
git push -u origin <branch-name>

# Create PR (IMPORTANT: unset GITHUB_TOKEN to use gh CLI's keyring token)
unset GITHUB_TOKEN && gh pr create --base develop --title "<type>: <description>" --body "..."
```

**CRITICAL**: If `GITHUB_TOKEN` env var is set (e.g., by claudetree), it may lack PR creation permissions. Always use `unset GITHUB_TOKEN && gh pr create ...` to ensure gh CLI uses the keyring token with proper scopes.

### 4. Release to main

When develop is stable:
1. Create PR from `develop` to `main`
2. Merge triggers GitHub Action
3. Action creates "Release PR" with:
   - Updated CHANGELOG.md
   - Bumped versions
4. Merge Release PR to publish to npm

## Commit Message Format

```
<type>(<scope>): <subject>

<body>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

## Commands Reference

```bash
# Check current branch
git branch --show-current

# View changeset status
pnpm changeset status

# Preview version changes
pnpm changeset version --dry-run

# Build and publish (CI does this)
pnpm release
```

## Rules

1. Never commit directly to `main`
2. Always create changeset for user-facing changes
3. Keep PRs focused and small
4. Ensure tests pass before merging

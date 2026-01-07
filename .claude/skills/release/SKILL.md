---
name: release
description: Release Workflow - Merge develop to main, bump version, publish to npm, and create GitHub release.
allowed-tools: Read, Bash, Grep, Glob, Edit
user-invocable: /release
---

# Release Workflow

Automated release process for claudetree monorepo.

## Usage

```
/release [version-type]
```

Arguments:
- `patch` - Bug fixes (0.0.X)
- `minor` - New features (0.X.0)
- `major` - Breaking changes (X.0.0)
- Specific version: `0.4.0`

## Steps

### 1. Pre-flight Checks

```bash
# Ensure on develop branch
git branch --show-current

# Check for uncommitted changes
git status --porcelain

# Check npm login
npm whoami
```

### 2. Get Commit Diff

```bash
git log main..develop --oneline
```

### 3. Merge to Main

```bash
git checkout main
git pull origin main
git merge develop --no-edit
```

### 4. Determine Version

- Check current: `npm view @claudetree/cli version`
- Use argument or infer from commits:
  - `feat:` → minor
  - `fix:` → patch
  - `BREAKING:` → major

### 5. Bump Versions (All Packages)

```bash
cd packages/shared && npm version <ver> --no-git-tag-version && cd ../..
cd packages/core && npm version <ver> --no-git-tag-version && cd ../..
cd packages/cli && npm version <ver> --no-git-tag-version && cd ../..
cd packages/web && npm version <ver> --no-git-tag-version && cd ../..
```

### 6. Build All

```bash
pnpm build
```

### 7. Commit & Tag

```bash
git add -A
git commit -m "chore: bump version to <version>"
git tag v<version>
```

### 8. Publish to npm (Order Matters!)

```bash
pnpm --filter @claudetree/shared publish --access public --no-git-checks
pnpm --filter @claudetree/core publish --access public --no-git-checks
pnpm --filter @claudetree/cli publish --access public --no-git-checks
```

### 9. Push to GitHub

```bash
git push origin main
git push origin v<version>
```

### 10. Create GitHub Release

```bash
unset GITHUB_TOKEN && gh release create v<version> --title "v<version> - <Title>" --notes "..."
```

### 11. Sync Develop

```bash
git checkout develop
git merge main --no-edit
git push origin develop
```

## Release Notes Template

```markdown
## v<version> - <Title>

### New Features
- feat: description

### Bug Fixes
- fix: description

### Improvements
- refactor/chore: description

---

## Install / Update
npm install -g @claudetree/cli
```

## Critical Rules

1. **Build before publish** - Ensures all packages compile
2. **Publish in order** - shared → core → cli (dependency chain)
3. **Check npm login** - `npm whoami` before publish
4. **Sync develop** - Merge main back to develop after release
5. **Unset GITHUB_TOKEN** - For gh CLI commands

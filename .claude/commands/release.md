# Release Workflow

Merge develop to main, bump version, publish to npm, and create release notes.

## Steps

1. **Check commit differences**
   ```bash
   git log main..develop --oneline
   ```

2. **Checkout and merge**
   ```bash
   git checkout main
   git pull origin main
   git merge develop --no-edit
   ```

3. **Determine version bump**
   - Check current version: `npm view @claudetree/cli version`
   - Major (1.0.0): Breaking changes
   - Minor (0.x.0): New features
   - Patch (0.0.x): Bug fixes

4. **Update versions**
   ```bash
   cd packages/cli && npm version <version> --no-git-tag-version
   cd ../core && npm version <version> --no-git-tag-version
   cd ../shared && npm version <version> --no-git-tag-version
   cd ../web && npm version <version> --no-git-tag-version
   ```

5. **Build all packages**
   ```bash
   pnpm build
   ```

6. **Commit version bump**
   ```bash
   git add -A
   git commit -m 'chore: bump version to <version>'
   git tag v<version>
   ```

7. **Publish to npm** (order matters: shared -> core -> cli)
   ```bash
   pnpm --filter @claudetree/shared publish --access public --no-git-checks
   pnpm --filter @claudetree/core publish --access public --no-git-checks
   pnpm --filter @claudetree/cli publish --access public --no-git-checks
   ```

8. **Push to remote**
   ```bash
   git push origin main
   git push origin v<version>
   ```

9. **Generate release notes**
   Create notes based on commits between versions

## Release Notes Template

```markdown
## vX.Y.Z - <Title>

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

## Arguments

- First argument: Version type (patch, minor, major) or specific version (0.2.0)

## CRITICAL RULES

1. **Always build before publish** - Ensure all packages compile
2. **Publish in order** - shared -> core -> cli (dependency order)
3. **Check npm login** - Run `npm whoami` before publish
4. **Sync develop after release** - Merge main back to develop
5. **Fix type errors** - If build fails, fix and retry

## Example Usage

```
/release minor
/release 0.3.0
/release patch
```

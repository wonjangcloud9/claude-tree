# Release Workflow

Prepare a release from develop to main.

## Steps

1. Check current branch and status
```bash
git branch --show-current
git status
pnpm changeset status
```

2. Ensure all tests pass
```bash
pnpm test:run
```

3. Review pending changesets
```bash
ls .changeset/*.md
```

4. If on develop and ready:
```bash
# Push develop
git push origin develop

# Create PR to main via GitHub
```

5. After PR merged to main:
- GitHub Action creates Release PR
- Review and merge Release PR
- npm packages published automatically

## Pre-release Checklist

- [ ] All tests passing
- [ ] Changesets added for changes
- [ ] No uncommitted changes
- [ ] develop is up to date with main

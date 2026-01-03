# Start New Feature

Create a new feature branch from develop.

## Usage

Provide feature name as argument: `/feature <name>`

## Steps

1. Ensure on develop and up to date
```bash
git checkout develop
git pull origin develop
```

2. Create feature branch
```bash
git checkout -b feature/<name>
```

3. After work is done, create changeset
```bash
pnpm changeset
```

4. Commit and push
```bash
git add -A
git commit -m "feat: <description>"
git push -u origin feature/<name>
```

5. Create PR to develop on GitHub

## Naming Convention

- `feature/<name>` - New features
- `fix/<name>` - Bug fixes
- `docs/<name>` - Documentation
- `refactor/<name>` - Refactoring

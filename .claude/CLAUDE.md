# Claude Code Project Instructions

## GitHub Token Configuration

### Problem: GITHUB_TOKEN conflicts with gh CLI

When `GITHUB_TOKEN` environment variable is set (e.g., by claudetree or CI), it may not have the required scopes for PR creation. The gh CLI prioritizes environment variables over keyring tokens.

### Solution: Unset GITHUB_TOKEN before gh commands

```bash
# Always use this pattern for PR creation
unset GITHUB_TOKEN && gh pr create --base develop --title "..." --body "..."

# Or for any gh command that requires repo write access
unset GITHUB_TOKEN && gh <command>
```

### Token Scopes Required

For PR creation, your token needs:
- `repo` (full repo access) OR
- `public_repo` (for public repos only)

### Recommended Setup

1. Login with gh CLI (stores in keyring with proper scopes):
   ```bash
   gh auth login
   ```

2. For claudetree, set a separate token in `.claudetree/config.json`:
   ```json
   {
     "github": {
       "token": "ghp_xxx"
     }
   }
   ```

## Development Workflow

- Base branch: `develop`
- Release branch: `main`
- Always create PRs to `develop` first
- Use changesets for versioning: `pnpm changeset`

## Testing

```bash
pnpm --filter @claudetree/core test:run
pnpm --filter @claudetree/cli test
```

## Build

```bash
pnpm build
```

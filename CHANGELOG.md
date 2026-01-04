# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-01-04

### Features

- **web**: Add session monitoring dashboard with real-time updates
- **web**: Add worktree auto-sync on dashboard load
- **web**: Add session delete with worktree cleanup
- **commands**: Add issue creation and discovery commands (`/issue`, `/discover`)
- **monorepo**: Add changesets and git workflow for versioning

### Bug Fixes

- **core**: Use execa in `isClaudeAvailable` for testability
- **cli,web**: Improve Claude session streaming and web API paths
- **ci**: Resolve pnpm version conflict and remove lint job

### Documentation

- Improve README with clearer usage workflow
- Add why section and `ct` shorthand alias
- Update commit command with safe output format
- Update discover skill to auto-create issues

### Chore

- Prepare packages for npm publish
  - Add `files`, `repository`, `license` fields
  - Replace `workspace:*` with fixed versions

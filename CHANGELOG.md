# Changelog

All notable changes to this project will be documented in this file.

## [0.4.5] - 2026-01-09

### Features

- **web**: Add live code streaming for real-time output
- **core**: Add AI code review summary generation
- **web**: Add WebSocket file watcher for real-time session updates
- **web**: Add delete button to session cards

### Tests

- **cli**: Add comprehensive tests for CLI commands (init, list, start, status, stop, web, demo, bustercall)
- **core**: Add tests for AIReviewGenerator, ValidationGateRunner, Logger
- **core**: Add CI workflow configuration tests

### Refactoring

- **cli**: Split large command files into smaller modules (start, bustercall, chain)
- **web**: Split docs page into smaller reusable components
  - ArchitectureSection, ApiReferenceSection, CliReferenceSection
  - ConfigurationSection, GettingStartedSection, SessionTemplatesSection
  - AdvancedSection, DocsFooter, docsStyles

### CI/CD

- Add GitHub Actions CI/CD pipeline with lint and typecheck
- Reorder CI steps: build before typecheck (required for @claudetree/shared types)

### Bug Fixes

- **web**: Fix SessionDetailPage test failures (missing /ai-review API mock)
- **web**: Fix WebSocket auto-reconnect race condition in tests
- **cli**: Fix unused variable lint error in start.ts

## [0.4.4] - 2026-01-08

### Features

- **cli**: Add `ct chain` command for dependency chain execution
  - Execute issues sequentially where each builds on the previous branch
  - Supports `--skip-failed`, `--template`, `--base-branch`, `--dry-run` options
  - Useful for sequential features (DB → API → UI) and dependent fixes
- **core**: Add `baseBranch` support to worktree creation
  - GitWorktreeAdapter now accepts optional base branch parameter
  - Enables creating worktrees from non-default branches

### Documentation

- Update README.md with Dependency Chain section
- Update all translated docs (ko, ja, zh) with new features
- Add bustercall and chain commands to CLI command tables

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

# Changelog

All notable changes to this project will be documented in this file.

## [0.5.10] - 2026-03-28

### Features

- **cli**: Add `ct export` command - generate session reports in markdown or JSON
  - Summary stats: sessions, success rate, cost, tokens, avg duration
  - Per-session breakdown: issue, status, duration, cost, token usage
  - `--format json` for machine-readable output
  - `--output report.md` to write to file
  - `--status completed` to filter by session status
  - Unique feature: no competitor tool generates shareable session reports

## [0.5.9] - 2026-03-28

### Features

- **cli**: Reorder commands in `ct --help` for logical workflow grouping (init→start→status→stats→log→...)
- **cli**: Add Quick Start guide to `ct --help` footer

### Documentation

- **root**: Add `ct config` to root translated READMEs (ko/ja/zh command tables)

## [0.5.8] - 2026-03-28

### Documentation

- **all**: Add `ct config` to command tables in all READMEs (root + CLI in 4 languages)
- **web**: Add `ct config` section to CLI Reference docs with usage examples
- **web**: Add `ct config` to docs sidebar navigation
- **web**: Document GitHub auto-detection in `ct init` section
- Quality audit: verified no stale references, all versions consistent, 100% command test coverage

## [0.5.7] - 2026-03-28

### Features

- **cli**: Add `ct config` command - view/modify config without editing JSON
  - `ct config` shows all config with colored output
  - `ct config get github.owner` reads specific keys (dot notation)
  - `ct config set github.owner myorg` sets values
  - Supports `--json` flag for machine-readable output

### Tests

- **cli**: Add 5 tests for GitHub remote auto-detection in `ct init`
  - Tests SSH/HTTPS URL parsing, missing remote fallback, output messages
- **cli**: Add 7 tests for `ct config` command

## [0.5.6] - 2026-03-28

### Features

- **web**: Add ct stats, ct log, ct chain, ct doctor sections to CLI Reference docs page
- **web**: Rename bustercall to auto in docs sidebar and reference section
- **web**: Add 4 new test cases for new command sections (159 total web tests)

## [0.5.5] - 2026-03-28

### Features

- **cli**: Auto-detect GitHub remote in `ct init` - parses git origin to prefill owner/repo in config

### Documentation

- **root**: Sync Korean README (README.ko.md) - badges, comparison table, batch section, new commands
- **root**: Sync Japanese README (README.ja.md) - badges, comparison table, batch section, new commands
- **root**: Sync Chinese README (README.zh.md) - badges, comparison table, batch section, new commands

### Chores

- Clean 5 stale worktrees from previous sessions

## [0.5.4] - 2026-03-28

### Documentation

- **root**: Update root README - remove stale demo refs, add stats/log/auto to command table, strengthen comparison table
- **root**: Add monitoring commands (ct log, ct stats) to Quick Start section
- **root**: Rename "Bustercall" section to "Batch Processing" with ct auto/batch distinction
- **cli**: Sync Korean README (README.ko.md) with new English version
- **cli**: Sync Japanese README (README.ja.md) with new English version
- **cli**: Sync Chinese README (README.zh.md) with new English version

## [0.5.3] - 2026-03-28

### Features

- **cli**: Add `ct auto` as intuitive alias for `bustercall` (auto-fetch + conflict detection)
- **cli**: Overhaul CLI README for npm - clear value prop table, 60-second quick start, all commands documented

### Improvements

- **cli**: Improve all command descriptions for better `ct --help` output
- **cli**: Update command table to include new commands (stats, log, auto)
- **cli**: Remove stale demo reference from README

## [0.5.2] - 2026-03-28

### Features

- **cli**: Add `ct log` command - view session events/output in terminal (supports --follow, --type filter, --json)

### Performance

- **cli/core**: Exclude test files from production build via `tsconfig.build.json` - CLI package 54% smaller, Core package 43% smaller on npm

## [0.5.1] - 2026-03-28

### Fixes

- Fix repository URL inconsistency (root pointed to wrong GitHub org)
- Fix CLI version display (dynamic from package.json instead of hardcoded)
- Fix `pnpm typecheck` script to match CI pipeline (`pnpm -r exec tsc --noEmit`)

### Improvements

- Add `engines: { node: ">=22.0.0" }` to all published packages
- Add `.npmignore` to cli/core/shared to reduce npm package size
- Add npm version, downloads, CI status, and license badges to README
- Sync web package version with other packages (0.5.0 -> 0.5.1)

## [0.5.0] - 2026-03-28

### Features

- **cli**: Add `ct stats` command for terminal-based session analytics (cost, tokens, success rate, daily breakdown)
- **cli**: Improve package positioning to clearly communicate value vs Claude Code native

### Removed

- **cli**: Remove `ct demo` command (unnecessary bloat for real users)
- **core**: Remove CI workflow generation tests (overlaps with native Claude Code)

### Improvements

- **cli**: Update CLI description to highlight key differentiators: issue-to-PR automation, parallel sessions, cost tracking
- **all**: Update package descriptions and keywords for better npm discoverability

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

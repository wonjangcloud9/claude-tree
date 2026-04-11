# @claudetree/core

## 0.11.1

### Patch Changes

- Updated dependencies
  - @claudetree/shared@0.8.0

## 0.11.0

### Minor Changes

- feat: 3 new session templates + ct archive command

  - New templates: security (audit), migration, performance (profiling)
  - New ct archive: archive old sessions with time/tag/status filtering
  - Upgrade @types/node 25.0.3 → 25.6.0

## 0.10.0

### Minor Changes

- feat: vitest 3→4 major upgrade, ct diff, ConcurrencyGuard, doctor enhancements

  - Major upgrade: vitest 3.2.4 → 4.1.4, @vitest/coverage-v8 4.1.4
  - All test mocks migrated to vitest 4 class syntax
  - New ct diff command for viewing session worktree changes
  - ConcurrencyGuard for global session limit enforcement
  - Doctor: config validation + disk space check (9 checks)

### Patch Changes

- Updated dependencies
  - @claudetree/shared@0.7.1

## 0.9.0

### Minor Changes

- feat: ct diff, ConcurrencyGuard, enhanced ct doctor

  - New ct diff command to view session worktree changes with stat/full diff
  - ConcurrencyGuard for global session limit enforcement
  - Doctor now validates config fields and checks disk space (9 checks total)

## 0.8.0

### Minor Changes

- feat: ct summary, Discord notifications, MCP ct_summary tool

  - New ct summary command with text/markdown/JSON output, time/tag filtering
  - New DiscordNotifier for webhook notifications (session + batch)
  - MCP server now has 11 tools including ct_summary

## 0.7.0

### Minor Changes

- feat: session context memory for cross-session continuity

  New SessionContextStore persists session context (commits, files, decisions)
  and auto-injects prior context when starting sessions for the same issue.

## 0.6.1

### Patch Changes

- feat: add session tagging for organization and filtering

  - Add tags field to Session type
  - Add --tag flag to ct start and ct status
  - Add tag filtering to MCP ct_sessions_list and ct_start tools

- Updated dependencies
  - @claudetree/shared@0.7.0

## 0.6.0

### Minor Changes

- feat: session auto-retry, health monitoring, and ct watch command

  - Add `--retry` and `--retry-delay` flags to `ct start` for automatic session recovery with exponential backoff
  - Add `--health` flag to `ct status` for zombie process detection and auto-recovery
  - Add `ct watch` command for continuous GitHub issue polling with auto session start
  - Add RetryConfig and SessionRetryManager to core
  - Add retryCount/lastError tracking to Session type
  - Upgrade 14 npm dependencies (patch/minor)

### Patch Changes

- Updated dependencies
  - @claudetree/shared@0.6.0

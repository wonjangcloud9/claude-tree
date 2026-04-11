# @claudetree/shared

## 0.8.0

### Minor Changes

- feat: ct template command, tag/retry stats in dashboard

  - New ct template list/show/create for managing session templates from CLI
  - Web dashboard stats now include tag breakdown and retry statistics
  - TagBreakdown and RetryStats types in shared package

## 0.7.1

### Patch Changes

- feat: vitest 3→4 major upgrade, ct diff, ConcurrencyGuard, doctor enhancements

  - Major upgrade: vitest 3.2.4 → 4.1.4, @vitest/coverage-v8 4.1.4
  - All test mocks migrated to vitest 4 class syntax
  - New ct diff command for viewing session worktree changes
  - ConcurrencyGuard for global session limit enforcement
  - Doctor: config validation + disk space check (9 checks)

## 0.7.0

### Minor Changes

- feat: add session tagging for organization and filtering

  - Add tags field to Session type
  - Add --tag flag to ct start and ct status
  - Add tag filtering to MCP ct_sessions_list and ct_start tools

## 0.6.0

### Minor Changes

- feat: session auto-retry, health monitoring, and ct watch command

  - Add `--retry` and `--retry-delay` flags to `ct start` for automatic session recovery with exponential backoff
  - Add `--health` flag to `ct status` for zombie process detection and auto-recovery
  - Add `ct watch` command for continuous GitHub issue polling with auto session start
  - Add RetryConfig and SessionRetryManager to core
  - Add retryCount/lastError tracking to Session type
  - Upgrade 14 npm dependencies (patch/minor)

# @claudetree/mcp

## 0.12.0

### Minor Changes

- feat: add ct cleanup command and update MCP tools with new capabilities

  CLI:

  - New `ct cleanup` command: smart session + worktree cleanup
    - `--status completed|failed|both` to target specific session states
    - `--older-than <duration>` (e.g., 24h, 7d) to only clean old sessions
    - `--batch <batchId>` to clean specific bustercall batch
    - `--dry-run` to preview changes

  MCP:

  - Updated `ct_bustercall` tool with resume, sort, review params
  - New `ct_rerun` tool: rerun failed/completed sessions
  - New `ct_tag` tool: add/remove session tags
  - New `ct_cost` tool: cost analytics with batch tracking

## 0.11.4

### Patch Changes

- Updated dependencies
  - @claudetree/shared@0.8.0
  - @claudetree/core@0.11.1

## 0.11.3

### Patch Changes

- Updated dependencies
  - @claudetree/core@0.11.0

## 0.11.2

### Patch Changes

- feat: vitest 3→4 major upgrade, ct diff, ConcurrencyGuard, doctor enhancements

  - Major upgrade: vitest 3.2.4 → 4.1.4, @vitest/coverage-v8 4.1.4
  - All test mocks migrated to vitest 4 class syntax
  - New ct diff command for viewing session worktree changes
  - ConcurrencyGuard for global session limit enforcement
  - Doctor: config validation + disk space check (9 checks)

- Updated dependencies
  - @claudetree/core@0.10.0
  - @claudetree/shared@0.7.1

## 0.11.1

### Patch Changes

- Updated dependencies
  - @claudetree/core@0.9.0

## 0.11.0

### Minor Changes

- feat: ct summary, Discord notifications, MCP ct_summary tool

  - New ct summary command with text/markdown/JSON output, time/tag filtering
  - New DiscordNotifier for webhook notifications (session + batch)
  - MCP server now has 11 tools including ct_summary

### Patch Changes

- Updated dependencies
  - @claudetree/core@0.8.0

## 0.10.1

### Patch Changes

- Updated dependencies
  - @claudetree/core@0.7.0

## 0.10.0

### Minor Changes

- feat: add ct pr command and MCP ct_pr tool

  Auto-create quality pull requests from completed sessions with
  categorized commits, issue linking, session metrics, and diff stats.
  MCP server now exposes 10 tools including ct_pr.

## 0.9.0

### Minor Changes

- feat: budget alerts and MCP bustercall tool

  - Progressive budget alerts at 50%, 75%, 90% of --max-cost in ct start
  - New ct_bustercall MCP tool for AI-driven issue orchestration (9 tools total)

## 0.8.0

### Minor Changes

- feat: add session tagging for organization and filtering

  - Add tags field to Session type
  - Add --tag flag to ct start and ct status
  - Add tag filtering to MCP ct_sessions_list and ct_start tools

### Patch Changes

- Updated dependencies
  - @claudetree/shared@0.7.0
  - @claudetree/core@0.6.1

## 0.7.0

### Minor Changes

- feat: add @claudetree/mcp - MCP server for AI tool integration

  New package exposes claudetree as a Model Context Protocol server with 8 tools:
  ct_sessions_list, ct_session_detail, ct_session_logs, ct_start, ct_stop,
  ct_stats, ct_health, ct_config.

# @claudetree/mcp

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

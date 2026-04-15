<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.zh.md">中文</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@claudetree/cli"><img src="https://img.shields.io/npm/v/@claudetree/cli.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@claudetree/cli"><img src="https://img.shields.io/npm/dm/@claudetree/cli.svg" alt="npm downloads"></a>
  <a href="https://github.com/wonjangcloud9/claude-tree/actions/workflows/ci.yml"><img src="https://github.com/wonjangcloud9/claude-tree/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen" alt="node version">
</p>

# @claudetree/cli

**GitHub Issue URL -> Autonomous Implementation -> Pull Request.** Zero manual intervention.

claudetree runs multiple Claude Code sessions in parallel, each in its own isolated git worktree. Pass a GitHub issue, walk away, come back to a PR.

## What Claude Code Can't Do (But claudetree Can)

| Capability | Claude Code | claudetree |
|-----------|-------------|------------|
| Parallel sessions | One at a time | Unlimited |
| Issue-to-PR pipeline | Manual copy-paste | `ct start <url>` |
| Session cost tracking | Current session only | Per-session + total |
| Batch issue processing | N/A | `ct batch` / `ct auto` |
| Dependency chains | N/A | `ct chain` |
| Web dashboard | N/A | `ct web` |
| Session logs | Scroll terminal | `ct log <id>` |

## Install

```bash
npm install -g @claudetree/cli
```

Requires: Node.js >= 22, Git, [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)

## 60-Second Quick Start

```bash
# 1. Initialize in your project
ct init

# 2. Verify setup
ct doctor

# 3. Fire and forget — Claude handles the rest
ct start https://github.com/you/repo/issues/42

# 4. Monitor
ct status          # terminal overview
ct log abc123      # session event log
ct web             # full web dashboard
```

## Core Workflows

### Single Issue

```bash
ct start 42                              # by issue number
ct start https://github.com/org/repo/issues/42  # by URL
ct start "fix the login bug"             # by description
```

### Batch Processing

```bash
# Manual: specify which issues
ct batch 101 102 103
ct batch --label bug --limit 10

# Auto: fetch all open issues with smart conflict detection
ct auto                          # alias for bustercall
ct auto --label "high-priority" --dry-run
```

### Dependency Chains

```bash
# Run sequentially: DB schema -> API -> UI
ct chain 10 11 12
```

### Cost Tracking

```bash
# Set a budget limit per session
ct start 42 --max-cost 5.00

# View analytics
ct stats

# Per-session cost in status
ct status
```

## Commands

| Command | Description |
|---------|-------------|
| `ct start <issue>` | Start a Claude session for a GitHub issue |
| `ct status` | Show all session statuses with cost |
| `ct stats` | Session analytics: cost, tokens, success rate |
| `ct log <session>` | View session events (supports -f follow) |
| `ct stop [id]` | Stop a running session |
| `ct resume <id>` | Resume a paused session |
| `ct batch [issues]` | Process a list of issues in parallel |
| `ct auto` | Auto-fetch issues with conflict detection |
| `ct chain [issues]` | Run issues sequentially (dependency order) |
| `ct config` | View or modify config (`ct config set github.owner myorg`) |
| `ct export` | Generate session report (markdown or JSON) |
| `ct web` | Launch web dashboard at localhost:3000 |
| `ct list` | List all worktrees |
| `ct clean` | Remove finished worktrees |
| `ct doctor` | Verify setup + npm version check |
| `ct init` | Initialize claudetree in your project |
| `ct inspect <id>` | One-stop session detail view |
| `ct cost` | Cost analytics with daily breakdown + budget monitoring |
| `ct tag <id> add/remove <tags>` | Manage session tags |
| `ct rerun <id>` | Rerun a failed/completed session |
| `ct cleanup` | Smart batch cleanup of sessions + worktrees |
| `ct report` | Generate markdown report for team sharing |
| `ct completion [shell]` | Shell autocomplete (bash/zsh/fish) |

### Bustercall Enhancements

```bash
ct auto --sort priority --review      # Priority sort + auto-review
ct auto --dry-run                     # Smart analysis: S/M/L/XL complexity
ct auto --resume batch-abc123         # Retry only failed sessions
ct status --batch batch-abc123        # Filter by batch
ct status --state failed              # Filter by status
```

## TDD Mode (Default)

All sessions enforce Test-Driven Development by default:

```bash
ct start 42                          # TDD with 2h timeout
ct start 42 --gates test,type,lint   # custom validation gates
ct start 42 --no-tdd                 # disable TDD
```

## Links

- [GitHub](https://github.com/wonjangcloud9/claude-tree)
- [Full Documentation](https://github.com/wonjangcloud9/claude-tree#readme)
- [Changelog](https://github.com/wonjangcloud9/claude-tree/blob/develop/CHANGELOG.md)

## License

MIT

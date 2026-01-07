<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.zh.md">中文</a>
</p>

# @claudetree/cli

**Run multiple Claude Code sessions in parallel** — each in its own isolated git worktree.

## Installation

```bash
npm install -g @claudetree/cli
# or
pnpm add -g @claudetree/cli
```

## Quick Start

```bash
# Initialize in your project
ct init

# Start working on a GitHub issue (TDD mode by default)
ct start https://github.com/you/repo/issues/42

# Or use natural language
ct start "fix the login validation bug"

# Monitor progress
ct status

# Open web dashboard
ct web
```

## TDD Mode (Default)

All sessions run in TDD mode by default:

```bash
# TDD mode with 2h timeout (default)
ct start 42

# Custom timeout and gates
ct start 42 --timeout 60 --gates test,type,lint

# Disable TDD mode
ct start 42 --no-tdd
```

**TDD Options:**
- `--timeout <min>` - Session timeout (default: 120)
- `--idle-timeout <min>` - Idle timeout (default: 10)
- `--gates <gates>` - Validation gates: test,type,lint,build (default: test,type)
- `--max-retries <n>` - Gate retry count (default: 3)
- `--no-tdd` - Disable TDD mode

## Commands

| Command | Description |
|---------|-------------|
| `ct init` | Initialize claudetree in your project |
| `ct start <issue>` | Create worktree and start Claude session |
| `ct status` | Show all session statuses |
| `ct stop [id]` | Stop a session |
| `ct doctor` | Check environment health |
| `ct demo` | Interactive demo (no tokens used) |
| `ct batch` | Process multiple issues in parallel |
| `ct bustercall` | Auto-fetch all open issues and run parallel sessions |
| `ct clean` | Remove all worktrees (except main) |
| `ct web` | Start web dashboard |

## Bustercall (Batch Processing)

Process multiple GitHub issues in parallel with smart conflict detection:

```bash
# Preview which issues will be processed
ct bustercall --dry-run

# Run with default settings (3 parallel)
ct bustercall

# Force sequential execution
ct bustercall --sequential

# Custom conflict labels
ct bustercall --conflict-labels "deps,config"
```

**Conflict Detection:** Issues that may modify shared files (package.json, config) are automatically detected and run sequentially to prevent merge conflicts.

## Key Features

- **Multi-session**: Run unlimited Claude sessions in parallel
- **Isolated workspaces**: Each task gets its own git worktree
- **Fire and forget**: Pass a GitHub issue URL and Claude handles the rest
- **Token tracking**: See exactly how many tokens each session uses
- **Web dashboard**: Monitor all sessions in real-time

## Links

- [GitHub Repository](https://github.com/wonjangcloud9/claude-tree)
- [Full Documentation](https://github.com/wonjangcloud9/claude-tree#readme)

## License

MIT

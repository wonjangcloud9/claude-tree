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

# Start working on a GitHub issue
ct start https://github.com/you/repo/issues/42

# Monitor progress
ct status

# Open web dashboard
ct web
```

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
| `ct web` | Start web dashboard |

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

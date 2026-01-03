# claudetree

Git Worktree-based Claude Code multi-session manager.

Manage multiple Claude Code sessions across git worktrees with a web dashboard for real-time monitoring.

## Features

- **Issue-based Workflow**: Create worktrees directly from GitHub issues
- **Multi-session**: Run multiple Claude sessions in parallel
- **Web Dashboard**: Real-time monitoring of all sessions
- **Built-in Skills**: TDD and Code Review skills included
- **GitHub Integration**: Automatic branch naming from issue titles

## Installation

```bash
npm install -g @claudetree/cli
# or
pnpm add -g @claudetree/cli
```

## Quick Start

```bash
# Initialize in your repository
claudetree init

# Start from a GitHub issue URL
claudetree start https://github.com/owner/repo/issues/42

# Or just the issue number (requires config)
claudetree start 42

# Start with TDD skill
claudetree start 42 --skill tdd

# List all worktrees
claudetree list

# Check session status
claudetree status

# Start web dashboard
claudetree web
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `claudetree init` | Initialize claudetree in current repo |
| `claudetree start <issue>` | Create worktree and start Claude session |
| `claudetree list` | List all worktrees |
| `claudetree status` | Show all session statuses |
| `claudetree stop [id]` | Stop a session |
| `claudetree web` | Start web dashboard |

### Start Options

```bash
claudetree start <issue> [options]

Options:
  -p, --prompt <prompt>   Custom initial prompt
  -s, --skill <skill>     Skill to activate (tdd, review)
  -b, --branch <branch>   Custom branch name
  -t, --token <token>     GitHub token
  --no-session            Create worktree only
```

## Configuration

After `claudetree init`, configure GitHub in `.claudetree/config.json`:

```json
{
  "worktreeDir": ".worktrees",
  "github": {
    "owner": "your-username",
    "repo": "your-repo"
  }
}
```

Set `GITHUB_TOKEN` environment variable for GitHub API access.

## Web Dashboard

Start the dashboard to monitor all sessions:

```bash
claudetree web
```

- View all active sessions
- Real-time status updates via WebSocket
- Session details and prompts

## Built-in Skills

### TDD Workflow
Enforces Test-Driven Development:
- Write failing test first
- Implement minimal code
- Refactor

```bash
claudetree start 42 --skill tdd
```

### Code Review
Thorough code review with security focus:
- CRITICAL / WARNING / INFO levels
- Security, quality, test coverage

```bash
claudetree start 42 --skill review
```

## Development

```bash
# Clone and setup
git clone https://github.com/your-username/claude-tree.git
cd claude-tree
pnpm install

# Build
pnpm build

# Test
pnpm test

# Run CLI locally
node packages/cli/dist/index.js --help
```

## Architecture

```
packages/
├── cli/      # CLI commands (Commander.js)
├── core/     # Domain + Infrastructure
│   ├── git/          # GitWorktreeAdapter
│   ├── claude/       # ClaudeSessionAdapter
│   ├── github/       # GitHubAdapter (Octokit)
│   ├── storage/      # FileSessionRepository
│   └── websocket/    # WebSocketBroadcaster
├── shared/   # Shared TypeScript types
└── web/      # Next.js dashboard
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

MIT

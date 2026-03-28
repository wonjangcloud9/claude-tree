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
  <a href="https://github.com/wonjangcloud9/claude-tree/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@claudetree/cli.svg" alt="license"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen" alt="node version">
  <img src="https://img.shields.io/badge/TypeScript-ESM-blue" alt="TypeScript ESM">
</p>

# claudetree

**Run multiple Claude Code sessions in parallel** — each in its own isolated git worktree.

> **Tip:** You can use `ct` as a shorthand for `claudetree` in all commands.

## Why claudetree?

Claude Code is powerful, but it runs one session at a time in a single directory. What if you need to work on multiple issues simultaneously? Or delegate entire tasks to Claude without manual intervention?

**claudetree solves this** by combining git worktrees with automated Claude Code orchestration.

### Key Benefits

| Benefit | Description |
|---------|-------------|
| **Multi-session Management** | Run multiple Claude sessions in parallel, each working on different issues |
| **Isolated Workspaces** | Each task gets its own git worktree — no branch conflicts, no context pollution |
| **Fire and Forget** | Just pass a GitHub issue URL and Claude handles the rest: read code, implement, test, commit, and create PR |
| **Web Dashboard** | Monitor all sessions in real-time with a visual UI — track progress, view logs, manage sessions |
| **Automatic Workflow** | Claude automatically commits changes and creates PRs when work is complete |
| **Independent Context** | Each Claude session maintains its own context, preventing cross-task interference |

### Use Cases

- **Parallel Bug Fixes**: Work on multiple bug fixes simultaneously
- **Feature Development**: Delegate feature implementation to Claude while you focus on architecture
- **Code Reviews**: Let Claude implement changes while you review other PRs
- **Batch Processing**: Queue up multiple issues and let Claude work through them

## Important: Token Usage Warning

claudetree delegates entire sessions to Claude Code, which means:

- **High token consumption**: Each session runs autonomously, making multiple API calls
- **Cost awareness**: A single issue resolution can consume thousands of tokens
- **Recommended for**: Teams with Claude Pro/Team plans or sufficient API credits
- **Monitor usage**: Use `ct status` to track token usage and costs per session
- **Budget control**: Use `--max-cost` to automatically stop sessions that exceed a cost limit

Consider using `--no-session` flag to create worktrees without starting Claude if you want manual control.

## How It Works

```
Your Project (e.g., my-web-app/)
├── .claudetree/              ← Created by `ct init`
│   ├── config.json
│   ├── sessions.json
│   └── events/               ← Session logs
├── .worktrees/               ← Worktrees live here
│   ├── issue-42-fix-login/   ← Claude works here
│   └── issue-55-add-auth/    ← Another Claude works here
├── src/
└── ...
```

**The workflow is simple:**
1. You have a project with GitHub issues
2. Run `ct start <issue-url>` — claudetree creates a worktree and starts Claude
3. Claude reads the issue, implements the solution, runs tests, commits, and creates a PR
4. Monitor progress via CLI (`ct status`) or web dashboard (`ct web`)

## Installation

```bash
npm install -g @claudetree/cli
# or
pnpm add -g @claudetree/cli
```

For development:
```bash
git clone https://github.com/wonjangcloud9/claude-tree.git
cd claude-tree
pnpm install && pnpm build
cd packages/cli && pnpm link --global
```

## Quick Start

### Step 1: Initialize in your project

```bash
cd ~/projects/my-web-app    # Go to YOUR project
ct init                     # Initialize claudetree
```

### Step 2: Set up GitHub token

```bash
export GITHUB_TOKEN="ghp_your_token_here"
```

### Step 3: Start working on an issue

```bash
# From GitHub issue URL — Claude starts automatically
ct start https://github.com/you/my-web-app/issues/42

# Claude will:
# 1. Create a worktree and branch
# 2. Read the issue description
# 3. Implement the solution
# 4. Run tests
# 5. Commit and create a PR
```

### Step 4: Monitor progress

```bash
ct status           # CLI status view with progress bar & cost
ct status -w        # Watch mode (auto-refresh)
ct log abc123       # View session events
ct log abc123 -f    # Follow mode (live tailing)
ct stats            # Cost analytics and success rate
ct web              # Web dashboard at http://localhost:3000
```

**Status output includes:**
- Session progress: `●─●─◉─○─○ Implementing`
- Token usage: `12,345 in / 3,456 out`
- Cost tracking: `$0.1234`

## CLI Commands

| Command | Description |
|---------|-------------|
| `ct init` | Initialize claudetree in your project |
| `ct start <issue>` | Start a Claude session for a GitHub issue |
| `ct status` | Show all session statuses with progress & cost |
| `ct stats` | Session analytics: cost, tokens, success rate |
| `ct log <session>` | View session events (supports `-f` follow mode) |
| `ct stop [id]` | Stop a session |
| `ct resume <id>` | Resume a paused session |
| `ct list` | List all worktrees |
| `ct batch [issues]` | Process a list of issues in parallel |
| `ct auto` | Auto-fetch open issues with conflict detection |
| `ct chain [issues]` | Run issues sequentially (dependency order) |
| `ct config` | View or modify config (`ct config set github.owner myorg`) |
| `ct web` | Launch web dashboard at localhost:3000 |
| `ct clean` | Remove finished worktrees |
| `ct doctor` | Verify setup: Node, Git, Claude CLI, GitHub |

### Start Options

```bash
ct start <issue> [options]

Options:
  -p, --prompt <prompt>      Custom prompt for Claude
  -s, --skill <skill>        Activate skill (tdd, review)
  -T, --template <template>  Session template (bugfix, feature, refactor, review)
  -b, --branch <branch>      Custom branch name
  -t, --token <token>        GitHub token
  --max-cost <cost>          Budget limit in USD (auto-stops if exceeded)
  --lint <command>           Run lint after session (e.g., "npm run lint")
  --gate                     Fail session if lint fails
  --no-session               Create worktree only (no Claude)
```

### Examples

```bash
# Full automation — Claude does everything
ct start https://github.com/you/repo/issues/42

# Just create worktree, run Claude manually later
ct start 42 --no-session

# With TDD workflow (test first, then implement)
ct start 42 --skill tdd

# With budget limit ($0.50 max)
ct start 42 --max-cost 0.50

# With lint gate (fail if lint fails)
ct start 42 --lint "npm run lint" --gate

# Using a template
ct start 42 --template bugfix

# Full options
ct start 42 -s tdd --max-cost 1.00 --lint "npm run lint" --gate
```

## Configuration

After `ct init`, edit `.claudetree/config.json`:

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

Monitor all sessions in real-time from the web dashboard.

```bash
ct web    # http://localhost:3000
```

### Features

**Session List (Main Page)**
- All active sessions displayed as cards
- Color-coded by status (running/pending/completed/failed)
- Protected sessions (develop/main) cannot be deleted

**Session Detail Page**

| Panel | Description |
|-------|-------------|
| **Terminal Output** | Real-time Claude output streaming |
| **Timeline** | Work history (file changes, commits, tests) |
| **Tool Approvals** | Tools used by Claude (Read, Write, Bash, etc.) |
| **Code Review** | Change summary with approve/reject buttons |

### Real-time Updates

- WebSocket server on port 3001
- Auto-refresh on session state changes
- Live streaming of Claude output

### Statistics Dashboard (NEW)

Access session analytics at `/stats`:

```bash
ct web    # Go to http://localhost:3000/stats
```

**Available Metrics:**
- Total sessions, success rate
- Token usage (input/output)
- Cost tracking with daily/weekly trends
- Average session duration
- Visual charts (line, bar)

## Built-in Skills

### TDD Workflow
```bash
ct start 42 --skill tdd
```
Enforces strict Test-Driven Development:
1. **RED** — Write failing test first (commit: `test: ...`)
2. **GREEN** — Minimal implementation to pass (commit: `feat: ...`)
3. **REFACTOR** — Clean up code (commit: `refactor: ...`)

### Code Review
```bash
ct start 42 --skill review
```
Thorough code review with CRITICAL / WARNING / INFO levels

## Batch Processing

Process multiple GitHub issues in parallel. Use `ct auto` (smart mode) or `ct batch` (manual mode):

```bash
# Auto: fetch all open issues with smart conflict detection
ct auto --label bug --parallel 3
ct auto --label high-priority --parallel 5

# Manual: specify exact issues
ct batch 101 102 103
ct batch --label bug --limit 10
```

### Auto/Bustercall Options

| Option | Description |
|--------|-------------|
| `--label <label>` | Filter issues by GitHub label |
| `--parallel <n>` | Number of parallel sessions (default: 3) |
| `--max-cost <usd>` | Budget limit per session |
| `--dry-run` | Preview issues without starting sessions |

### Features

- **Conflict Detection**: Automatically detects issues that modify the same files and runs them sequentially
- **PR Filtering**: Skips issues that already have open PRs
- **Progress Tracking**: Real-time status updates for all sessions
- **Graceful Handling**: Continues processing even if some sessions fail

## Dependency Chain (NEW)

Chain multiple issues together where each builds on the previous one's branch:

```bash
# Execute issues 10 → 11 → 12 sequentially
# Issue 11 starts from issue-10 branch, issue 12 starts from issue-11 branch
ct chain 10 11 12

# Preview the chain plan
ct chain 10 11 12 --dry-run

# Use a template for all issues
ct chain 10 11 12 --template feature

# Continue even if one fails
ct chain 10 11 12 --skip-failed
```

### How It Works

```
Issue #10 (base: develop)
    ↓ completed
Issue #11 (base: issue-10)
    ↓ completed
Issue #12 (base: issue-11)
    ↓ completed
```

This is useful for:
- **Sequential features**: DB schema → API → UI changes
- **Dependent fixes**: Core fix → related fixes that depend on it
- **Progressive refactoring**: Step-by-step improvements that build on each other

### Chain Options

| Option | Description |
|--------|-------------|
| `--template <template>` | Session template for all issues |
| `--skip-failed` | Continue chain even if an issue fails |
| `--base-branch <branch>` | Base branch for first issue (default: develop) |
| `--dry-run` | Preview chain plan without executing |

## Session Templates

Templates provide pre-configured prompts for common tasks:

```bash
ct start 42 --template bugfix     # Focus on bug fixing
ct start 42 --template feature    # Feature implementation
ct start 42 --template refactor   # Code refactoring
ct start 42 --template review     # Code review
ct start 42 --template docs       # Documentation generation
```

### Documentation Skill (NEW)

Generate comprehensive documentation automatically:

```bash
ct start 42 --skill docs
# or
ct start 42 --template docs
```

Claude will:
1. Analyze codebase structure
2. Identify public APIs and types
3. Generate README.md with installation, usage, API reference
4. Create docs/ folder for detailed documentation

## Architecture

```
packages/
├── cli/      # CLI commands (Commander.js)
├── core/     # Domain + Infrastructure
│   ├── application/  # SessionManager
│   ├── domain/       # Repository interfaces
│   └── infra/
│       ├── git/          # GitWorktreeAdapter
│       ├── claude/       # ClaudeSessionAdapter
│       ├── github/       # GitHubAdapter (Octokit)
│       ├── storage/      # File repositories
│       └── websocket/    # WebSocketBroadcaster
├── shared/   # TypeScript types
└── web/      # Next.js dashboard
```

## Branch Strategy

```
main      ← stable releases (npm publish)
  ↑
develop   ← integration (PRs go here)
  ↑
feature/* ← your work (created by claudetree)
```

PRs are automatically created targeting the `develop` branch.

## Comparison

| Feature | Claude Code | claudetree |
|---------|-------------|------------|
| Parallel sessions | One at a time | Unlimited parallel |
| Issue-to-PR pipeline | Manual copy-paste | `ct start <url>` |
| Cost tracking | Current session only | Per-session + analytics (`ct stats`) |
| Batch processing | N/A | `ct batch` / `ct auto` |
| Dependency chains | N/A | `ct chain` |
| Session logs | Scroll terminal | `ct log` + web dashboard |
| Context isolation | Shared directory | Separate worktrees |
| Progress monitoring | Terminal only | CLI + web dashboard |

## Limitations

- **Token costs**: Autonomous sessions consume significant tokens (use `--max-cost` to limit)
- **Claude availability**: Requires Claude Code CLI installed (run `ct doctor` to check)
- **Git worktrees**: Project must be a git repository
- **GitHub integration**: Currently GitHub-only for issue fetching

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

MIT

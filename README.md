<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.zh.md">中文</a>
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
ct status    # CLI status view with progress bar & cost
ct status -w # Watch mode (auto-refresh)
ct web       # Web dashboard at http://localhost:3000
```

**Status output includes:**
- Session progress: `●─●─◉─○─○ Implementing`
- Token usage: `12,345 in / 3,456 out`
- Cost tracking: `$0.1234`

## CLI Commands

| Command | Description |
|---------|-------------|
| `ct init` | Initialize claudetree in your project |
| `ct start <issue>` | Create worktree and start Claude session |
| `ct list` | List all worktrees |
| `ct status` | Show all session statuses with progress & cost |
| `ct stop [id]` | Stop a session |
| `ct web` | Start web dashboard |
| `ct doctor` | Check environment setup (Claude CLI, Git, GitHub) |
| `ct demo` | Interactive demo to explore features |
| `ct bustercall` | Batch process multiple issues in parallel |

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

## Batch Processing with Bustercall

Process multiple GitHub issues in parallel with a single command:

```bash
# Process all issues with 'bug' label (3 parallel sessions)
ct bustercall --label bug --parallel 3

# Process high-priority issues
ct bustercall --label high-priority --parallel 5

# With budget limit per session
ct bustercall --label feature --parallel 3 --max-cost 0.50
```

### Bustercall Options

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

| Feature | Manual Claude | claudetree |
|---------|--------------|------------|
| Multiple sessions | One at a time | Unlimited parallel |
| Context isolation | Shared directory | Separate worktrees |
| Issue integration | Copy-paste | Automatic fetch |
| Progress monitoring | Terminal only | Web dashboard |
| PR creation | Manual | Automatic |
| Session management | Manual | Centralized |

## Limitations

- **Token costs**: Autonomous sessions consume significant tokens (use `--max-cost` to limit)
- **Claude availability**: Requires Claude Code CLI installed (run `ct doctor` to check)
- **Git worktrees**: Project must be a git repository
- **GitHub integration**: Currently GitHub-only for issue fetching

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

MIT

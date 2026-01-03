# claudetree

**Run multiple Claude Code sessions in parallel** — each in its own isolated git worktree.

## Why claudetree?

Claude Code is powerful, but it runs one session at a time in a single directory. What if you need to work on multiple issues simultaneously?

**claudetree solves this** by leveraging git worktrees:
- Each issue gets its own **isolated worktree** (separate directory, separate branch)
- Each worktree can run its own **independent Claude Code session**
- Multiple terminals = Multiple Claude sessions = **True parallel development**

No more waiting. No more context switching. Just spin up worktrees and let multiple Claude instances work on different issues at the same time.

> **Tip:** You can use `ct` as a shorthand for `claudetree` in all commands.

## How It Works

```
Your Project (e.g., my-web-app/)
├── .claudetree/              ← Created by `ct init`
│   └── config.json
├── .worktrees/               ← Worktrees live here
│   ├── issue-42-fix-login/   ← Claude works here
│   └── issue-55-add-auth/    ← Another Claude works here
├── src/
└── ...
```

**The idea is simple:**
1. You have a project with GitHub issues
2. For each issue, claudetree creates a separate git worktree
3. You can run Claude Code in each worktree independently
4. Multiple issues = Multiple Claude sessions = Parallel work

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

### Step 2: Start working on an issue

```bash
# From GitHub issue URL
ct start https://github.com/you/my-web-app/issues/42

# Or just issue number (after configuring github in .claudetree/config.json)
ct start 42

# Or a custom task name
ct start add-dark-mode
```

This creates:
- A new git branch: `issue-42-fix-login-bug`
- A new worktree: `.worktrees/issue-42-fix-login-bug/`

### Step 3: Work with Claude in that worktree

```bash
cd .worktrees/issue-42-fix-login-bug
claude    # Start Claude Code here
```

### Step 4: Monitor all sessions

```bash
ct status    # See all session statuses
ct web       # Open web dashboard at http://localhost:3000
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `ct init` | Initialize claudetree in your project |
| `ct start <issue>` | Create worktree from issue/task |
| `ct list` | List all worktrees |
| `ct status` | Show all session statuses |
| `ct stop [id]` | Stop a session |
| `ct web` | Start web dashboard |

### Start Options

```bash
ct start <issue> [options]

Options:
  -p, --prompt <prompt>   Custom prompt for Claude
  -s, --skill <skill>     Activate skill (tdd, review)
  -b, --branch <branch>   Custom branch name
  -t, --token <token>     GitHub token
  --no-session            Create worktree only (no Claude)
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

## Example Workflow

```bash
# You're working on my-web-app
cd ~/projects/my-web-app

# Initialize (one-time)
ct init

# Boss assigns you 3 issues to work on
ct start 42 --no-session   # Login bug
ct start 55 --no-session   # Add OAuth
ct start 67 --no-session   # Fix typos

# Check what worktrees exist
ct list

# Work on issue 42 with Claude
cd .worktrees/issue-42-fix-login
claude

# In another terminal, work on issue 55
cd .worktrees/issue-55-add-oauth
claude

# Monitor everything
ct status
ct web
```

## Web Dashboard

Monitor all sessions in real-time from the web dashboard.

### Start the Dashboard

```bash
ct web    # http://localhost:3000
```

### Features

**1. Session List (Main Page)**
- All active sessions displayed as cards
- Color-coded by status (running/pending/completed/failed)
- Click to navigate to detail page

**2. Session Detail Page (`/sessions/:id`)**

| Panel | Description |
|-------|-------------|
| **Terminal Output** | Real-time Claude terminal output streaming |
| **Timeline** | Completed work history (file changes, commits, tests, etc.) |
| **Tool Approvals** | List of tools used by Claude (Read, Write, Bash, etc.) |
| **Code Review** | Change summary with approve/reject buttons |

### Data Storage

```
.claudetree/
├── sessions.json       # Session list
├── events/             # Per-session event logs
│   └── {sessionId}.json
├── approvals/          # Tool approval records
│   └── {sessionId}.json
└── reviews/            # Code review info
    └── {sessionId}.json
```

### Auto-Sync Worktrees

Existing worktrees are automatically detected and registered as sessions when accessing the dashboard.

```bash
# Manually created worktrees are auto-detected
git worktree add .worktrees/my-feature -b my-feature
ct web    # → my-feature session automatically added
```

### WebSocket Real-time Updates

- WebSocket server runs on port 3001
- Auto-refresh on session state changes
- Event types: `session:*`, `event:created`, `approval:*`, `review:*`

## Built-in Skills

### TDD Workflow
```bash
ct start 42 --skill tdd
```
Forces Test-Driven Development: write test first → implement → refactor

### Code Review
```bash
ct start 42 --skill review
```
Thorough code review with CRITICAL / WARNING / INFO levels

## Architecture

```
packages/
├── cli/      # CLI commands (Commander.js)
├── core/     # Domain + Infrastructure
│   ├── application/  # SessionManager (events/approvals/reviews)
│   ├── domain/       # Repository interfaces
│   ├── infra/
│   │   ├── git/          # GitWorktreeAdapter
│   │   ├── claude/       # ClaudeSessionAdapter + EventEmitter
│   │   ├── github/       # GitHubAdapter (Octokit)
│   │   ├── storage/      # File*Repository (Session, Event, Approval, Review)
│   │   └── websocket/    # WebSocketBroadcaster
├── shared/   # TypeScript types (Session, Event, ToolApproval, CodeReview)
└── web/      # Next.js dashboard
    ├── app/
    │   ├── api/sessions/   # REST API endpoints
    │   └── sessions/[id]/  # Session detail page
    └── components/
        ├── timeline/       # Timeline, TimelineEvent
        ├── terminal/       # TerminalOutput
        ├── approval/       # ApprovalList, ApprovalCard
        └── review/         # CodeReviewPanel
```

## Branch Strategy

```
main      ← stable releases (npm publish)
  ↑
develop   ← integration (PRs go here)
  ↑
feature/* ← your work
```

We use [Changesets](https://github.com/changesets/changesets) for versioning.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

MIT

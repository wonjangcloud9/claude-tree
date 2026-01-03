# claudetree

Git Worktree-based Claude Code multi-session manager.

Run multiple Claude Code sessions in parallel using git worktrees — one worktree per issue, each with its own Claude session.

## How It Works

```
Your Project (e.g., my-web-app/)
├── .claudetree/              ← Created by `claudetree init`
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
claudetree init             # Initialize claudetree
```

### Step 2: Start working on an issue

```bash
# From GitHub issue URL
claudetree start https://github.com/you/my-web-app/issues/42

# Or just issue number (after configuring github in .claudetree/config.json)
claudetree start 42

# Or a custom task name
claudetree start add-dark-mode
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
claudetree status    # See all session statuses
claudetree web       # Open web dashboard at http://localhost:3000
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `claudetree init` | Initialize claudetree in your project |
| `claudetree start <issue>` | Create worktree from issue/task |
| `claudetree list` | List all worktrees |
| `claudetree status` | Show all session statuses |
| `claudetree stop [id]` | Stop a session |
| `claudetree web` | Start web dashboard |

### Start Options

```bash
claudetree start <issue> [options]

Options:
  -p, --prompt <prompt>   Custom prompt for Claude
  -s, --skill <skill>     Activate skill (tdd, review)
  -b, --branch <branch>   Custom branch name
  -t, --token <token>     GitHub token
  --no-session            Create worktree only (no Claude)
```

## Configuration

After `claudetree init`, edit `.claudetree/config.json`:

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
claudetree init

# Boss assigns you 3 issues to work on
claudetree start 42 --no-session   # Login bug
claudetree start 55 --no-session   # Add OAuth
claudetree start 67 --no-session   # Fix typos

# Check what worktrees exist
claudetree list

# Work on issue 42 with Claude
cd .worktrees/issue-42-fix-login
claude

# In another terminal, work on issue 55
cd .worktrees/issue-55-add-oauth
claude

# Monitor everything
claudetree status
claudetree web
```

## Built-in Skills

### TDD Workflow
```bash
claudetree start 42 --skill tdd
```
Forces Test-Driven Development: write test first → implement → refactor

### Code Review
```bash
claudetree start 42 --skill review
```
Thorough code review with CRITICAL / WARNING / INFO levels

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

# @claudetree/core

Core domain and infrastructure for claudetree.

## Overview

This package contains:
- **Domain layer**: Repository interfaces and business logic
- **Infrastructure layer**: Git worktree, Claude CLI, GitHub API, Slack adapters
- **Application layer**: Session management and orchestration

## Installation

```bash
npm install @claudetree/core
# or
pnpm add @claudetree/core
```

## Main Components

### Adapters
- `GitWorktreeAdapter` - Git worktree management
- `ClaudeSessionAdapter` - Claude CLI process management
- `GitHubAdapter` - GitHub API (issues, PRs)
- `SlackNotifier` - Slack webhook notifications
- `WebSocketBroadcaster` - Real-time event broadcasting

### Repositories
- `FileSessionRepository` - Session state persistence
- `FileEventRepository` - Event logging
- `TemplateLoader` - Session template management

## Usage

```typescript
import {
  GitWorktreeAdapter,
  ClaudeSessionAdapter,
  FileSessionRepository,
} from '@claudetree/core';

const git = new GitWorktreeAdapter(projectPath);
const worktrees = await git.list();
```

## Links

- [GitHub Repository](https://github.com/wonjangcloud9/claude-tree)
- [CLI Package](https://www.npmjs.com/package/@claudetree/cli)

## License

MIT

# @claudetree/shared

Shared TypeScript types and utilities for claudetree.

## Installation

```bash
npm install @claudetree/shared
# or
pnpm add @claudetree/shared
```

## Types

### Session
```typescript
interface Session {
  id: string;
  worktreeId: string;
  claudeSessionId: string | null;
  status: SessionStatus;
  issueNumber: number | null;
  prompt: string | null;
  usage: TokenUsage | null;
  // ...
}

type SessionStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';
```

### TokenUsage
```typescript
interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  totalCostUsd: number;
}
```

### Other Types
- `Worktree` - Git worktree information
- `Issue` - GitHub issue data
- `SessionEvent` - Session activity events
- `ToolApproval` - Tool approval requests
- `CodeReview` - Code review requests
- `SessionTemplate` - Session templates

## Usage

```typescript
import type { Session, SessionStatus, TokenUsage } from '@claudetree/shared';

const session: Session = {
  id: 'abc123',
  status: 'running',
  // ...
};
```

## Links

- [GitHub Repository](https://github.com/wonjangcloud9/claude-tree)
- [CLI Package](https://www.npmjs.com/package/@claudetree/cli)

## License

MIT

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.zh.md">中文</a>
</p>

# @claudetree/shared

claudetree的共享TypeScript类型和工具。

## 安装

```bash
npm install @claudetree/shared
# 或
pnpm add @claudetree/shared
```

## 类型

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

### 其他类型
- `Worktree` - Git worktree信息
- `Issue` - GitHub问题数据
- `SessionEvent` - 会话活动事件
- `ToolApproval` - 工具审批请求
- `CodeReview` - 代码审查请求
- `SessionTemplate` - 会话模板

## 使用方法

```typescript
import type { Session, SessionStatus, TokenUsage } from '@claudetree/shared';

const session: Session = {
  id: 'abc123',
  status: 'running',
  // ...
};
```

## 链接

- [GitHub仓库](https://github.com/wonjangcloud9/claude-tree)
- [CLI包](https://www.npmjs.com/package/@claudetree/cli)

## 许可证

MIT

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.zh.md">中文</a>
</p>

# @claudetree/shared

claudetreeの共有TypeScript型とユーティリティ。

## インストール

```bash
npm install @claudetree/shared
# または
pnpm add @claudetree/shared
```

## 型

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

### その他の型
- `Worktree` - Git worktree情報
- `Issue` - GitHub課題データ
- `SessionEvent` - セッション活動イベント
- `ToolApproval` - ツール承認リクエスト
- `CodeReview` - コードレビューリクエスト
- `SessionTemplate` - セッションテンプレート

## 使用方法

```typescript
import type { Session, SessionStatus, TokenUsage } from '@claudetree/shared';

const session: Session = {
  id: 'abc123',
  status: 'running',
  // ...
};
```

## リンク

- [GitHubリポジトリ](https://github.com/wonjangcloud9/claude-tree)
- [CLIパッケージ](https://www.npmjs.com/package/@claudetree/cli)

## ライセンス

MIT

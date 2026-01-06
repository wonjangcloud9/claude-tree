<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.zh.md">中文</a>
</p>

# @claudetree/shared

claudetree의 공유 TypeScript 타입과 유틸리티.

## 설치

```bash
npm install @claudetree/shared
# 또는
pnpm add @claudetree/shared
```

## 타입

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

### 기타 타입
- `Worktree` - Git worktree 정보
- `Issue` - GitHub 이슈 데이터
- `SessionEvent` - 세션 활동 이벤트
- `ToolApproval` - 도구 승인 요청
- `CodeReview` - 코드 리뷰 요청
- `SessionTemplate` - 세션 템플릿

## 사용법

```typescript
import type { Session, SessionStatus, TokenUsage } from '@claudetree/shared';

const session: Session = {
  id: 'abc123',
  status: 'running',
  // ...
};
```

## 링크

- [GitHub 저장소](https://github.com/wonjangcloud9/claude-tree)
- [CLI 패키지](https://www.npmjs.com/package/@claudetree/cli)

## 라이선스

MIT

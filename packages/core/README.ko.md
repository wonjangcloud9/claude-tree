<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.zh.md">中文</a>
</p>

# @claudetree/core

claudetree의 핵심 도메인과 인프라스트럭처.

## 개요

이 패키지는 다음을 포함합니다:
- **도메인 레이어**: Repository 인터페이스와 비즈니스 로직
- **인프라 레이어**: Git worktree, Claude CLI, GitHub API, Slack 어댑터
- **애플리케이션 레이어**: 세션 관리와 오케스트레이션

## 설치

```bash
npm install @claudetree/core
# 또는
pnpm add @claudetree/core
```

## 주요 컴포넌트

### 어댑터
- `GitWorktreeAdapter` - Git worktree 관리
- `ClaudeSessionAdapter` - Claude CLI 프로세스 관리
- `GitHubAdapter` - GitHub API (이슈, PR)
- `SlackNotifier` - Slack 웹훅 알림
- `WebSocketBroadcaster` - 실시간 이벤트 브로드캐스팅

### 리포지토리
- `FileSessionRepository` - 세션 상태 영속화
- `FileEventRepository` - 이벤트 로깅
- `TemplateLoader` - 세션 템플릿 관리

## 사용법

```typescript
import {
  GitWorktreeAdapter,
  ClaudeSessionAdapter,
  FileSessionRepository,
} from '@claudetree/core';

const git = new GitWorktreeAdapter(projectPath);
const worktrees = await git.list();
```

## 링크

- [GitHub 저장소](https://github.com/wonjangcloud9/claude-tree)
- [CLI 패키지](https://www.npmjs.com/package/@claudetree/cli)

## 라이선스

MIT

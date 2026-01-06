<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.zh.md">中文</a>
</p>

# @claudetree/core

claudetreeのコアドメインとインフラストラクチャ。

## 概要

このパッケージには以下が含まれます：
- **ドメインレイヤー**: Repositoryインターフェースとビジネスロジック
- **インフラレイヤー**: Git worktree、Claude CLI、GitHub API、Slackアダプター
- **アプリケーションレイヤー**: セッション管理とオーケストレーション

## インストール

```bash
npm install @claudetree/core
# または
pnpm add @claudetree/core
```

## 主要コンポーネント

### アダプター
- `GitWorktreeAdapter` - Git worktree管理
- `ClaudeSessionAdapter` - Claude CLIプロセス管理
- `GitHubAdapter` - GitHub API（課題、PR）
- `SlackNotifier` - Slackウェブフック通知
- `WebSocketBroadcaster` - リアルタイムイベントブロードキャスト

### リポジトリ
- `FileSessionRepository` - セッション状態永続化
- `FileEventRepository` - イベントロギング
- `TemplateLoader` - セッションテンプレート管理

## 使用方法

```typescript
import {
  GitWorktreeAdapter,
  ClaudeSessionAdapter,
  FileSessionRepository,
} from '@claudetree/core';

const git = new GitWorktreeAdapter(projectPath);
const worktrees = await git.list();
```

## リンク

- [GitHubリポジトリ](https://github.com/wonjangcloud9/claude-tree)
- [CLIパッケージ](https://www.npmjs.com/package/@claudetree/cli)

## ライセンス

MIT

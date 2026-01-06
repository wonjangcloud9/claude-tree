<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.zh.md">中文</a>
</p>

# @claudetree/core

claudetree的核心领域和基础设施。

## 概述

此包包含：
- **领域层**: Repository接口和业务逻辑
- **基础设施层**: Git worktree、Claude CLI、GitHub API、Slack适配器
- **应用层**: 会话管理和编排

## 安装

```bash
npm install @claudetree/core
# 或
pnpm add @claudetree/core
```

## 主要组件

### 适配器
- `GitWorktreeAdapter` - Git worktree管理
- `ClaudeSessionAdapter` - Claude CLI进程管理
- `GitHubAdapter` - GitHub API（问题、PR）
- `SlackNotifier` - Slack webhook通知
- `WebSocketBroadcaster` - 实时事件广播

### 存储库
- `FileSessionRepository` - 会话状态持久化
- `FileEventRepository` - 事件日志
- `TemplateLoader` - 会话模板管理

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

## 链接

- [GitHub仓库](https://github.com/wonjangcloud9/claude-tree)
- [CLI包](https://www.npmjs.com/package/@claudetree/cli)

## 许可证

MIT

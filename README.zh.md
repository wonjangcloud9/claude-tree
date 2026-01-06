<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.zh.md">中文</a>
</p>

# claudetree

**并行运行多个Claude Code会话** — 每个会话在独立的git worktree中运行。

> **提示：** 所有命令中可以使用 `ct` 代替 `claudetree`。

## 为什么选择claudetree？

Claude Code功能强大，但一次只能在单个目录中运行一个会话。如果您需要同时处理多个问题，或者想在无需手动干预的情况下将整个任务委托给Claude？

**claudetree解决了这个问题** — 将git worktree与自动化的Claude Code编排相结合。

### 主要优势

| 优势 | 描述 |
|------|------|
| **多会话管理** | 并行运行多个Claude会话，每个处理不同的问题 |
| **隔离的工作空间** | 每个任务都有自己的git worktree — 无分支冲突，无上下文污染 |
| **即发即忘** | 只需传递GitHub问题URL，Claude处理其余：读取代码、实现、测试、提交和创建PR |
| **Web仪表板** | 通过可视化UI实时监控所有会话 — 跟踪进度、查看日志、管理会话 |
| **自动工作流** | 工作完成时Claude自动提交更改并创建PR |
| **独立上下文** | 每个Claude会话维护自己的上下文，防止跨任务干扰 |

### 使用场景

- **并行修复Bug**: 同时进行多个bug修复
- **功能开发**: 专注于架构的同时将功能实现委托给Claude
- **代码审查**: 在审查其他PR的同时让Claude实现更改
- **批量处理**: 排队多个问题让Claude依次处理

## 重要：Token使用警告

claudetree将整个会话委托给Claude Code：

- **高Token消耗**: 每个会话自主运行，进行多次API调用
- **成本意识**: 单个问题解决可能消耗数千个token
- **推荐对象**: 拥有Claude Pro/Team计划或足够API额度的团队
- **监控使用量**: 使用 `ct status` 跟踪每个会话的token使用量和成本
- **预算控制**: 使用 `--max-cost` 在超出成本限制时自动停止

如需手动控制，可使用 `--no-session` 标志仅创建worktree而不启动Claude。

## 工作原理

```
Your Project (例如: my-web-app/)
├── .claudetree/              ← 由 `ct init` 创建
│   ├── config.json
│   ├── sessions.json
│   └── events/               ← 会话日志
├── .worktrees/               ← Worktree存储位置
│   ├── issue-42-fix-login/   ← Claude工作空间
│   └── issue-55-add-auth/    ← 另一个Claude工作空间
├── src/
└── ...
```

**工作流程很简单：**
1. 您有一个带有GitHub问题的项目
2. 运行 `ct start <issue-url>` — claudetree创建worktree并启动Claude
3. Claude读取问题、实现解决方案、运行测试、提交并创建PR
4. 通过CLI (`ct status`) 或Web仪表板 (`ct web`) 监控进度

## 安装

```bash
npm install -g @claudetree/cli
# 或
pnpm add -g @claudetree/cli
```

开发用：
```bash
git clone https://github.com/wonjangcloud9/claude-tree.git
cd claude-tree
pnpm install && pnpm build
cd packages/cli && pnpm link --global
```

## 快速开始

### 步骤1：在项目中初始化

```bash
cd ~/projects/my-web-app    # 进入您的项目
ct init                     # 初始化claudetree
```

### 步骤2：设置GitHub Token

```bash
export GITHUB_TOKEN="ghp_your_token_here"
```

### 步骤3：开始处理问题

```bash
# 从GitHub问题URL — Claude自动启动
ct start https://github.com/you/my-web-app/issues/42

# Claude将执行：
# 1. 创建Worktree和分支
# 2. 读取问题描述
# 3. 实现解决方案
# 4. 运行测试
# 5. 提交并创建PR
```

### 步骤4：监控进度

```bash
ct status    # CLI状态视图（进度条 & 成本）
ct status -w # 监视模式（自动刷新）
ct web       # Web仪表板 http://localhost:3000
```

**状态输出包括：**
- 会话进度: `●─●─◉─○─○ Implementing`
- Token使用量: `12,345 in / 3,456 out`
- 成本跟踪: `$0.1234`

## CLI命令

| 命令 | 描述 |
|------|------|
| `ct init` | 在项目中初始化claudetree |
| `ct start <issue>` | 创建Worktree并启动Claude会话 |
| `ct list` | 列出所有worktree |
| `ct status` | 显示所有会话状态（进度 & 成本） |
| `ct stop [id]` | 停止会话 |
| `ct web` | 启动Web仪表板 |
| `ct doctor` | 检查环境设置（Claude CLI、Git、GitHub） |
| `ct demo` | 功能探索的交互式演示 |

### Start选项

```bash
ct start <issue> [options]

Options:
  -p, --prompt <prompt>      Claude的自定义提示
  -s, --skill <skill>        激活技能 (tdd, review)
  -T, --template <template>  会话模板 (bugfix, feature, refactor, review)
  -b, --branch <branch>      自定义分支名
  -t, --token <token>        GitHub Token
  --max-cost <cost>          USD预算限制（超出时自动停止）
  --lint <command>           会话后运行lint（例如: "npm run lint"）
  --gate                     lint失败时会话失败
  --no-session               仅创建Worktree（不启动Claude）
```

### 示例

```bash
# 完全自动化 — Claude处理一切
ct start https://github.com/you/repo/issues/42

# 仅创建Worktree，稍后手动运行Claude
ct start 42 --no-session

# TDD工作流（先测试，后实现）
ct start 42 --skill tdd

# 预算限制（最多$0.50）
ct start 42 --max-cost 0.50

# Lint门控（lint失败则会话失败）
ct start 42 --lint "npm run lint" --gate

# 使用模板
ct start 42 --template bugfix

# 完整选项
ct start 42 -s tdd --max-cost 1.00 --lint "npm run lint" --gate
```

## 配置

`ct init` 后，编辑 `.claudetree/config.json`：

```json
{
  "worktreeDir": ".worktrees",
  "github": {
    "owner": "your-username",
    "repo": "your-repo"
  }
}
```

设置 `GITHUB_TOKEN` 环境变量以访问GitHub API。

## Web仪表板

通过Web仪表板实时监控所有会话。

```bash
ct web    # http://localhost:3000
```

### 功能

**会话列表（主页）**
- 所有活动会话以卡片形式显示
- 按状态颜色编码（running/pending/completed/failed）
- 受保护的会话（develop/main）无法删除

**会话详情页**

| 面板 | 描述 |
|------|------|
| **终端输出** | 实时Claude输出流 |
| **时间线** | 工作历史（文件更改、提交、测试） |
| **工具审批** | Claude使用的工具（Read、Write、Bash等） |
| **代码审查** | 带有批准/拒绝按钮的更改摘要 |

### 实时更新

- 端口3001的WebSocket服务器
- 会话状态更改时自动刷新
- Claude输出实时流式传输

## 内置技能

### TDD工作流
```bash
ct start 42 --skill tdd
```
强制执行严格的测试驱动开发：
1. **RED** — 先写失败的测试（commit: `test: ...`）
2. **GREEN** — 最小实现以通过测试（commit: `feat: ...`）
3. **REFACTOR** — 清理代码（commit: `refactor: ...`）

### 代码审查
```bash
ct start 42 --skill review
```
CRITICAL / WARNING / INFO级别的彻底代码审查

## 会话模板

模板为常见任务提供预配置的提示：

```bash
ct start 42 --template bugfix     # 专注于bug修复
ct start 42 --template feature    # 功能实现
ct start 42 --template refactor   # 代码重构
ct start 42 --template review     # 代码审查
```

## 架构

```
packages/
├── cli/      # CLI命令（Commander.js）
├── core/     # 领域 + 基础设施
│   ├── application/  # SessionManager
│   ├── domain/       # Repository接口
│   └── infra/
│       ├── git/          # GitWorktreeAdapter
│       ├── claude/       # ClaudeSessionAdapter
│       ├── github/       # GitHubAdapter (Octokit)
│       ├── storage/      # 文件存储库
│       └── websocket/    # WebSocketBroadcaster
├── shared/   # TypeScript类型
└── web/      # Next.js仪表板
```

## 分支策略

```
main      ← 稳定发布（npm publish）
  ↑
develop   ← 集成（PR目标）
  ↑
feature/* ← 工作分支（claudetree创建）
```

PR自动创建并以 `develop` 分支为目标。

## 对比

| 功能 | 手动Claude | claudetree |
|------|------------|------------|
| 多会话 | 一次一个 | 无限并行 |
| 上下文隔离 | 共享目录 | 独立worktree |
| 问题集成 | 复制粘贴 | 自动获取 |
| 进度监控 | 仅终端 | Web仪表板 |
| PR创建 | 手动 | 自动 |
| 会话管理 | 手动 | 集中管理 |

## 限制

- **Token成本**: 自主会话消耗大量token（使用 `--max-cost` 限制）
- **Claude可用性**: 需要安装Claude Code CLI（运行 `ct doctor` 检查）
- **Git worktrees**: 项目必须是git仓库
- **GitHub集成**: 目前仅支持从GitHub获取问题

## 贡献

开发指南请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

MIT

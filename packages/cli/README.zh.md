<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.zh.md">中文</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@claudetree/cli"><img src="https://img.shields.io/npm/v/@claudetree/cli.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@claudetree/cli"><img src="https://img.shields.io/npm/dm/@claudetree/cli.svg" alt="npm downloads"></a>
  <a href="https://github.com/wonjangcloud9/claude-tree/actions/workflows/ci.yml"><img src="https://github.com/wonjangcloud9/claude-tree/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen" alt="node version">
</p>

# @claudetree/cli

**GitHub Issue URL -> 自主实现 -> Pull Request。零人工干预。**

claudetree 可并行运行多个 Claude Code 会话，每个会话在独立的 git worktree 中运行。传入 GitHub Issue，离开，回来后即可获得 PR。

## Claude Code做不到的（claudetree可以）

| 能力 | Claude Code | claudetree |
|------|-------------|------------|
| 并行会话 | 一次只能一个 | 无限制 |
| Issue到PR流水线 | 手动复制粘贴 | `ct start <url>` |
| 会话成本追踪 | 仅当前会话 | 单会话 + 总计 |
| 批量Issue处理 | 不支持 | `ct batch` / `ct auto` |
| 依赖链 | 不支持 | `ct chain` |
| Web仪表板 | 不支持 | `ct web` |
| 会话日志 | 翻滚终端 | `ct log <id>` |

## 安装

```bash
npm install -g @claudetree/cli
```

需要: Node.js >= 22, Git, [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)

## 60秒快速开始

```bash
# 1. 在项目中初始化
ct init

# 2. 验证环境
ct doctor

# 3. 即发即忘 - Claude处理其余
ct start https://github.com/you/repo/issues/42

# 4. 监控
ct status          # 终端概览
ct log abc123      # 会话事件日志
ct web             # Web仪表板
```

## 核心工作流

### 单个Issue

```bash
ct start 42                              # 按Issue编号
ct start https://github.com/org/repo/issues/42  # 按URL
ct start "fix the login bug"             # 按描述
```

### 批量处理

```bash
# 手动指定Issue
ct batch 101 102 103
ct batch --label bug --limit 10

# 自动: 获取所有open Issue，智能冲突检测
ct auto                          # bustercall的别名
ct auto --label "high-priority" --dry-run
```

### 依赖链

```bash
# 按顺序运行: 数据库Schema -> API -> UI
ct chain 10 11 12
```

### 成本追踪

```bash
# 为每个会话设置预算上限
ct start 42 --max-cost 5.00

# 查看分析数据
ct stats

# 在状态中查看单会话成本
ct status
```

## 命令

| 命令 | 描述 |
|------|------|
| `ct init` | 在项目中初始化claudetree |
| `ct start <issue>` | 为GitHub Issue启动Claude会话 |
| `ct status` | 显示所有会话状态及成本 |
| `ct stats` | 会话分析: 成本、token、成功率 |
| `ct log <session>` | 查看会话事件（支持 -f 跟踪） |
| `ct stop [id]` | 停止运行中的会话 |
| `ct resume <id>` | 恢复暂停的会话 |
| `ct batch [issues]` | 并行处理多个Issue |
| `ct auto` | 自动获取Issue并检测冲突 |
| `ct chain [issues]` | 按顺序运行Issue（依赖顺序） |
| `ct config` | 查看或修改配置（`ct config set github.owner myorg`） |
| `ct web` | 在 localhost:3000 启动Web仪表板 |
| `ct list` | 列出所有worktree |
| `ct clean` | 删除已完成的worktree |
| `ct doctor` | 检查环境: Node, Git, Claude CLI |

## TDD模式

所有会话默认启用测试驱动开发:

```bash
ct start 42                          # TDD模式，2小时超时
ct start 42 --gates test,type,lint   # 自定义验证门
ct start 42 --no-tdd                 # 禁用TDD
```

## 链接

- [GitHub](https://github.com/wonjangcloud9/claude-tree)
- [完整文档](https://github.com/wonjangcloud9/claude-tree#readme)
- [更新日志](https://github.com/wonjangcloud9/claude-tree/blob/develop/CHANGELOG.md)

## 许可证

MIT

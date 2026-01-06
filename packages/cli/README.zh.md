<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.zh.md">中文</a>
</p>

# @claudetree/cli

**并行运行多个Claude Code会话** — 每个会话在独立的git worktree中运行。

## 安装

```bash
npm install -g @claudetree/cli
# 或
pnpm add -g @claudetree/cli
```

## 快速开始

```bash
# 在项目中初始化
ct init

# 开始处理GitHub问题
ct start https://github.com/you/repo/issues/42

# 监控进度
ct status

# 打开Web仪表板
ct web
```

## 命令

| 命令 | 描述 |
|------|------|
| `ct init` | 在项目中初始化claudetree |
| `ct start <issue>` | 创建Worktree并启动Claude会话 |
| `ct status` | 显示所有会话状态 |
| `ct stop [id]` | 停止会话 |
| `ct doctor` | 检查环境健康状态 |
| `ct demo` | 交互式演示（不消耗token） |
| `ct batch` | 并行处理多个问题 |
| `ct web` | 启动Web仪表板 |

## 主要功能

- **多会话**: 无限并行运行Claude会话
- **隔离工作空间**: 每个任务都有自己的git worktree
- **即发即忘**: 传递GitHub问题URL，Claude处理其余
- **Token追踪**: 准确查看每个会话使用的token数量
- **Web仪表板**: 实时监控所有会话

## 链接

- [GitHub仓库](https://github.com/wonjangcloud9/claude-tree)
- [完整文档](https://github.com/wonjangcloud9/claude-tree#readme)

## 许可证

MIT

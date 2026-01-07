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

# 开始处理GitHub问题（默认TDD模式）
ct start https://github.com/you/repo/issues/42

# 监控进度
ct status

# 打开Web仪表板
ct web
```

## TDD模式（默认）

所有会话默认以TDD模式运行：

```bash
# TDD模式（2小时超时，默认）
ct start 42

# 自定义超时和验证门
ct start 42 --timeout 60 --gates test,type,lint

# 禁用TDD模式
ct start 42 --no-tdd
```

**TDD选项：**
- `--timeout <分钟>` - 会话超时（默认：120）
- `--idle-timeout <分钟>` - 空闲超时（默认：10）
- `--gates <gates>` - 验证门：test,type,lint,build（默认：test,type）
- `--max-retries <n>` - 门重试次数（默认：3）
- `--no-tdd` - 禁用TDD模式

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
| `ct bustercall` | 自动获取所有open问题并运行并行会话 |
| `ct clean` | 删除所有worktree（main除外） |
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

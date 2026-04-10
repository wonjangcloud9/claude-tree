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

**GitHub Issue URL -> 自律的な実装 -> Pull Request。手動介入ゼロ。**

claudetreeは複数のClaude Codeセッションを並列実行し、それぞれ独立したgit worktreeで動作します。GitHub Issueを渡して放置するだけで、PRが完成します。

## Claude Codeにできないこと（claudetreeなら可能）

| 機能 | Claude Code | claudetree |
|------|-------------|------------|
| 並列セッション | 一度に1つだけ | 無制限 |
| Issue-to-PRパイプライン | 手動コピペ | `ct start <url>` |
| セッションコスト追跡 | 現セッションのみ | セッション別 + 合計 |
| バッチIssue処理 | 非対応 | `ct batch` / `ct auto` |
| 依存チェーン | 非対応 | `ct chain` |
| Webダッシュボード | 非対応 | `ct web` |
| セッションログ | ターミナルをスクロール | `ct log <id>` |

## インストール

```bash
npm install -g @claudetree/cli
```

必要環境: Node.js >= 22, Git, [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)

## 60秒クイックスタート

```bash
# 1. プロジェクトで初期化
ct init

# 2. 環境チェック
ct doctor

# 3. Fire and forget — Claudeが残りを処理
ct start https://github.com/you/repo/issues/42

# 4. モニタリング
ct status          # ターミナルで概要確認
ct log abc123      # セッションイベントログ
ct web             # Webダッシュボード
```

## コアワークフロー

### 単一Issue

```bash
ct start 42                              # Issue番号で指定
ct start https://github.com/org/repo/issues/42  # URLで指定
ct start "fix the login bug"             # 説明文で指定
```

### バッチ処理

```bash
# 手動: 対象Issueを指定
ct batch 101 102 103
ct batch --label bug --limit 10

# 自動: open Issueを取得し、コンフリクト検知付きで実行
ct auto
ct auto --label "high-priority" --dry-run
```

### 依存チェーン

```bash
# 順序実行: DBスキーマ -> API -> UI
ct chain 10 11 12
```

### コスト追跡

```bash
# セッションごとの予算上限を設定
ct start 42 --max-cost 5.00

# 分析レポートを表示
ct stats

# ステータスでセッション別コストを確認
ct status
```

## コマンド

| コマンド | 説明 |
|----------|------|
| `ct init` | プロジェクトにclaudetreeを初期化 |
| `ct start <issue>` | GitHub Issueに対してClaudeセッションを開始 |
| `ct status` | 全セッションのステータスとコストを表示 |
| `ct stats` | セッション分析: コスト、トークン、成功率 |
| `ct log <session>` | セッションイベントを表示（-f でフォロー可能） |
| `ct stop [id]` | 実行中のセッションを停止 |
| `ct resume <id>` | 一時停止中のセッションを再開 |
| `ct batch [issues]` | 複数Issueを並列処理 |
| `ct auto` | open Issueを自動取得し、コンフリクト検知付きで実行 |
| `ct chain [issues]` | Issueを順序実行（依存関係順） |
| `ct config` | 設定の表示・変更（`ct config set github.owner myorg`） |
| `ct web` | Webダッシュボードを起動（localhost:3000） |
| `ct list` | 全worktreeを一覧表示 |
| `ct clean` | 完了済みworktreeを削除 |
| `ct doctor` | 環境チェック: Node, Git, Claude CLI |

## TDDモード（デフォルト）

全セッションはデフォルトでテスト駆動開発を適用します:

```bash
ct start 42                          # TDDモード（2時間タイムアウト）
ct start 42 --gates test,type,lint   # 検証ゲートをカスタマイズ
ct start 42 --no-tdd                 # TDDモードを無効化
```

## リンク

- [GitHub](https://github.com/wonjangcloud9/claude-tree)
- [完全ドキュメント](https://github.com/wonjangcloud9/claude-tree#readme)
- [変更履歴](https://github.com/wonjangcloud9/claude-tree/blob/develop/CHANGELOG.md)

## ライセンス

MIT

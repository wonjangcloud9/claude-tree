<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.zh.md">中文</a>
</p>

# @claudetree/cli

**複数のClaude Codeセッションを並列実行** — それぞれ独立したgit worktreeで動作します。

## インストール

```bash
npm install -g @claudetree/cli
# または
pnpm add -g @claudetree/cli
```

## クイックスタート

```bash
# プロジェクトで初期化
ct init

# GitHub課題の作業開始（TDDモードがデフォルト）
ct start https://github.com/you/repo/issues/42

# 進捗監視
ct status

# Webダッシュボードを開く
ct web
```

## TDDモード（デフォルト）

すべてのセッションはデフォルトでTDDモードで実行されます：

```bash
# TDDモード（2時間タイムアウト、デフォルト）
ct start 42

# カスタムタイムアウトとゲート
ct start 42 --timeout 60 --gates test,type,lint

# TDDモードを無効化
ct start 42 --no-tdd
```

**TDDオプション：**
- `--timeout <分>` - セッションタイムアウト（デフォルト：120）
- `--idle-timeout <分>` - アイドルタイムアウト（デフォルト：10）
- `--gates <gates>` - 検証ゲート：test,type,lint,build（デフォルト：test,type）
- `--max-retries <n>` - ゲートリトライ回数（デフォルト：3）
- `--no-tdd` - TDDモード無効化

## コマンド

| コマンド | 説明 |
|----------|------|
| `ct init` | プロジェクトにclaudetree初期化 |
| `ct start <issue>` | Worktree作成とClaudeセッション開始 |
| `ct status` | すべてのセッションステータス表示 |
| `ct stop [id]` | セッション停止 |
| `ct doctor` | 環境ヘルスチェック |
| `ct demo` | インタラクティブデモ（トークン不使用） |
| `ct batch` | 複数の課題を並列処理 |
| `ct bustercall` | すべてのopen課題を自動取得して並列セッション実行 |
| `ct clean` | すべてのworktreeを削除（main以外） |
| `ct web` | Webダッシュボード開始 |

## 主な機能

- **マルチセッション**: 無制限のClaudeセッションを並列実行
- **独立ワークスペース**: 各タスクは独自のgit worktreeを持つ
- **Fire and Forget**: GitHub課題URLを渡すとClaudeが残りを処理
- **トークン追跡**: 各セッションが使用するトークンを正確に確認
- **Webダッシュボード**: すべてのセッションをリアルタイム監視

## リンク

- [GitHubリポジトリ](https://github.com/wonjangcloud9/claude-tree)
- [完全ドキュメント](https://github.com/wonjangcloud9/claude-tree#readme)

## ライセンス

MIT

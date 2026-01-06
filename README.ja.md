<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.zh.md">中文</a>
</p>

# claudetree

**複数のClaude Codeセッションを並列実行** — それぞれ独立したgit worktreeで動作します。

> **ヒント:** すべてのコマンドで `claudetree` の代わりに `ct` を使用できます。

## なぜclaudetree？

Claude Codeは強力ですが、単一のディレクトリで一度に1つのセッションしか実行できません。複数の課題を同時に作業したい場合や、手動介入なしでタスク全体をClaudeに委任したい場合は？

**claudetreeが解決します** — git worktreeと自動化されたClaude Codeオーケストレーションを組み合わせます。

### 主な利点

| 利点 | 説明 |
|------|------|
| **マルチセッション管理** | 複数のClaudeセッションを並列実行、それぞれ異なる課題に取り組む |
| **独立したワークスペース** | 各タスクは独自のgit worktreeを持つ — ブランチ競合なし、コンテキスト汚染なし |
| **Fire and Forget** | GitHub課題URLを渡すだけでClaudeが残りを処理: コード読み取り、実装、テスト、コミット、PR作成 |
| **Webダッシュボード** | すべてのセッションをリアルタイムUIで監視 — 進捗、ログ、セッション管理 |
| **自動ワークフロー** | 作業完了時にClaudeが自動的にコミットしてPR作成 |
| **独立コンテキスト** | 各Claudeセッションは独自のコンテキストを維持、タスク間干渉を防止 |

### ユースケース

- **並列バグ修正**: 複数のバグ修正を同時に進行
- **機能開発**: アーキテクチャに集中しながらClaudeに機能実装を委任
- **コードレビュー**: 他のPRをレビューしながらClaudeが変更を実装
- **バッチ処理**: 複数の課題をキューに入れてClaudeが順次処理

## 重要: トークン使用量の警告

claudetreeはセッション全体をClaude Codeに委任します:

- **高いトークン消費**: 各セッションが自律的に実行され、複数のAPI呼び出しを行う
- **コスト意識**: 単一の課題解決で数千トークンを消費する可能性
- **推奨対象**: Claude Pro/Teamプランまたは十分なAPIクレジットを持つチーム
- **使用量監視**: `ct status`でセッションごとのトークン使用量とコストを追跡
- **予算制御**: `--max-cost`でコスト上限を超えた場合に自動停止

手動制御が必要な場合は `--no-session` フラグでClaudeなしでworktreeのみ作成できます。

## 動作原理

```
Your Project (例: my-web-app/)
├── .claudetree/              ← `ct init`で作成
│   ├── config.json
│   ├── sessions.json
│   └── events/               ← セッションログ
├── .worktrees/               ← Worktree保存場所
│   ├── issue-42-fix-login/   ← Claudeの作業スペース
│   └── issue-55-add-auth/    ← 別のClaudeの作業スペース
├── src/
└── ...
```

**ワークフローはシンプル:**
1. GitHubの課題があるプロジェクト
2. `ct start <issue-url>` 実行 — claudetreeがworktree作成してClaude開始
3. Claudeが課題を読み、ソリューション実装、テスト実行、コミット、PR作成
4. CLI (`ct status`) またはWebダッシュボード (`ct web`) で進捗監視

## インストール

```bash
npm install -g @claudetree/cli
# または
pnpm add -g @claudetree/cli
```

開発用:
```bash
git clone https://github.com/wonjangcloud9/claude-tree.git
cd claude-tree
pnpm install && pnpm build
cd packages/cli && pnpm link --global
```

## クイックスタート

### ステップ1: プロジェクトで初期化

```bash
cd ~/projects/my-web-app    # あなたのプロジェクトに移動
ct init                     # claudetree初期化
```

### ステップ2: GitHubトークン設定

```bash
export GITHUB_TOKEN="ghp_your_token_here"
```

### ステップ3: 課題の作業開始

```bash
# GitHub課題URLから — Claude自動開始
ct start https://github.com/you/my-web-app/issues/42

# Claudeが行う作業:
# 1. Worktreeとブランチ作成
# 2. 課題説明読み取り
# 3. ソリューション実装
# 4. テスト実行
# 5. コミットとPR作成
```

### ステップ4: 進捗監視

```bash
ct status    # CLIステータスビュー（進捗バー & コスト）
ct status -w # ウォッチモード（自動更新）
ct web       # Webダッシュボード http://localhost:3000
```

**ステータス出力に含まれる情報:**
- セッション進捗: `●─●─◉─○─○ Implementing`
- トークン使用量: `12,345 in / 3,456 out`
- コスト追跡: `$0.1234`

## CLIコマンド

| コマンド | 説明 |
|----------|------|
| `ct init` | プロジェクトにclaudetree初期化 |
| `ct start <issue>` | Worktree作成とClaudeセッション開始 |
| `ct list` | すべてのworktree一覧 |
| `ct status` | すべてのセッションステータス（進捗 & コスト） |
| `ct stop [id]` | セッション停止 |
| `ct web` | Webダッシュボード開始 |
| `ct doctor` | 環境設定確認（Claude CLI、Git、GitHub） |
| `ct demo` | 機能探索用インタラクティブデモ |

### Startオプション

```bash
ct start <issue> [options]

Options:
  -p, --prompt <prompt>      Claude用カスタムプロンプト
  -s, --skill <skill>        スキル有効化 (tdd, review)
  -T, --template <template>  セッションテンプレート (bugfix, feature, refactor, review)
  -b, --branch <branch>      カスタムブランチ名
  -t, --token <token>        GitHubトークン
  --max-cost <cost>          USD予算上限（超過時自動停止）
  --lint <command>           セッション後にlint実行（例: "npm run lint"）
  --gate                     lint失敗時にセッション失敗
  --no-session               Worktreeのみ作成（Claudeなし）
```

### 例

```bash
# 完全自動化 — Claudeがすべて処理
ct start https://github.com/you/repo/issues/42

# Worktreeのみ作成、後で手動でClaude実行
ct start 42 --no-session

# TDDワークフロー（テストファースト、実装後）
ct start 42 --skill tdd

# 予算制限（$0.50最大）
ct start 42 --max-cost 0.50

# Lintゲート（lint失敗でセッション失敗）
ct start 42 --lint "npm run lint" --gate

# テンプレート使用
ct start 42 --template bugfix

# 全オプション
ct start 42 -s tdd --max-cost 1.00 --lint "npm run lint" --gate
```

## 設定

`ct init` 後、`.claudetree/config.json` を編集:

```json
{
  "worktreeDir": ".worktrees",
  "github": {
    "owner": "your-username",
    "repo": "your-repo"
  }
}
```

GitHub APIアクセス用に `GITHUB_TOKEN` 環境変数を設定。

## Webダッシュボード

Webダッシュボードですべてのセッションをリアルタイム監視。

```bash
ct web    # http://localhost:3000
```

### 機能

**セッション一覧（メインページ）**
- すべてのアクティブセッションをカード表示
- ステータス別カラーコード（running/pending/completed/failed）
- 保護されたセッション（develop/main）は削除不可

**セッション詳細ページ**

| パネル | 説明 |
|--------|------|
| **ターミナル出力** | リアルタイムClaude出力ストリーミング |
| **タイムライン** | 作業履歴（ファイル変更、コミット、テスト） |
| **ツール承認** | Claudeが使用したツール（Read、Write、Bash等） |
| **コードレビュー** | 承認/拒否ボタン付き変更サマリー |

### リアルタイム更新

- ポート3001のWebSocketサーバー
- セッション状態変更時に自動更新
- Claude出力のライブストリーミング

## 組み込みスキル

### TDDワークフロー
```bash
ct start 42 --skill tdd
```
厳格なテスト駆動開発を適用:
1. **RED** — 失敗するテストを先に書く（commit: `test: ...`）
2. **GREEN** — パスするための最小実装（commit: `feat: ...`）
3. **REFACTOR** — コード整理（commit: `refactor: ...`）

### コードレビュー
```bash
ct start 42 --skill review
```
CRITICAL / WARNING / INFOレベルの徹底したコードレビュー

## セッションテンプレート

テンプレートは一般的なタスク用に事前設定されたプロンプトを提供:

```bash
ct start 42 --template bugfix     # バグ修正に集中
ct start 42 --template feature    # 機能実装
ct start 42 --template refactor   # コードリファクタリング
ct start 42 --template review     # コードレビュー
```

## アーキテクチャ

```
packages/
├── cli/      # CLIコマンド（Commander.js）
├── core/     # ドメイン + インフラ
│   ├── application/  # SessionManager
│   ├── domain/       # Repositoryインターフェース
│   └── infra/
│       ├── git/          # GitWorktreeAdapter
│       ├── claude/       # ClaudeSessionAdapter
│       ├── github/       # GitHubAdapter (Octokit)
│       ├── storage/      # File repositories
│       └── websocket/    # WebSocketBroadcaster
├── shared/   # TypeScript型
└── web/      # Next.jsダッシュボード
```

## ブランチ戦略

```
main      ← 安定リリース（npm publish）
  ↑
develop   ← 統合（PRターゲット）
  ↑
feature/* ← 作業ブランチ（claudetreeが作成）
```

PRは自動的に `develop` ブランチをターゲットに作成されます。

## 比較

| 機能 | 手動Claude | claudetree |
|------|------------|------------|
| マルチセッション | 一度に1つ | 無制限並列 |
| コンテキスト分離 | 共有ディレクトリ | 別worktree |
| 課題統合 | コピペ | 自動取得 |
| 進捗監視 | ターミナルのみ | Webダッシュボード |
| PR作成 | 手動 | 自動 |
| セッション管理 | 手動 | 中央集権 |

## 制限事項

- **トークンコスト**: 自律セッションは相当なトークンを消費（`--max-cost`で制限）
- **Claude可用性**: Claude Code CLIのインストールが必要（`ct doctor`で確認）
- **Git worktrees**: プロジェクトがgitリポジトリである必要
- **GitHub統合**: 現在、課題取得はGitHubのみサポート

## 貢献

開発ガイドラインは[CONTRIBUTING.md](CONTRIBUTING.md)を参照してください。

## ライセンス

MIT

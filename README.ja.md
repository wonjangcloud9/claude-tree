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
  <a href="https://github.com/wonjangcloud9/claude-tree/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@claudetree/cli.svg" alt="license"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen" alt="node version">
  <img src="https://img.shields.io/badge/TypeScript-ESM-blue" alt="TypeScript ESM">
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
ct log <id>  # セッションイベント表示
ct log <id> -f  # フォローモード（リアルタイム）
ct stats     # コスト・トークン・成功率の分析
ct web       # Webダッシュボード http://localhost:3000
```

**ステータス出力に含まれる情報:**
- セッション進捗: `●─●─◉─○─○ Implementing`
- トークン使用量: `12,345 in / 3,456 out`
- コスト追跡: `$0.1234`

## CLIコマンド

| コマンド | 説明 |
|----------|------|
| `ct init` | プロジェクトにclaudetreeを初期化 |
| `ct start <issue>` | GitHub Issueに対するClaudeセッション開始 |
| `ct status` | 全セッションの状態表示（進捗・コスト含む） |
| `ct stats` | セッション分析：コスト、トークン、成功率 |
| `ct log <session>` | セッションイベント表示（`-f`フォローモード対応） |
| `ct stop [id]` | セッション停止 |
| `ct resume <id>` | 一時停止セッション再開 |
| `ct list` | 全worktree一覧 |
| `ct batch [issues]` | Issue一覧を並列処理 |
| `ct auto` | オープンIssueを自動取得＋コンフリクト検出 |
| `ct chain [issues]` | Issueを順次実行（依存関係順） |
| `ct config` | 設定の表示・変更（`ct config set github.owner myorg`） |
| `ct web` | Webダッシュボード起動（localhost:3000） |
| `ct clean` | 完了済みworktree削除 |
| `ct doctor` | 環境確認：Node、Git、Claude CLI、GitHub、バージョン |
| `ct inspect <id>` | セッション詳細情報（トークン、コスト、進行状況、タグ） |
| `ct cost` | コスト分析：日別チャート、バッチ別コスト、予算監視 |
| `ct tag <id> add/remove <tags>` | セッションタグの追加/削除 |
| `ct rerun <id>` | 失敗/完了セッションの再実行 |
| `ct cleanup` | 完了/失敗セッション + worktreeの一括削除 |
| `ct completion [shell]` | シェル自動補完スクリプト生成（bash/zsh/fish） |

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

### 統計ダッシュボード (NEW)

`/stats` でセッション分析にアクセス:

```bash
ct web    # http://localhost:3000/stats にアクセス
```

**利用可能なメトリクス:**
- 総セッション数、成功率
- トークン使用量（入力/出力）
- コスト追跡（日次/週次トレンド）
- 平均セッション時間
- ビジュアルチャート（折れ線、棒グラフ）

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
ct start 42 --template docs       # ドキュメント生成
```

### ドキュメントスキル (NEW)

ドキュメントを自動生成:

```bash
ct start 42 --skill docs
# または
ct start 42 --template docs
```

Claudeが実行する内容:
1. コードベース構造を分析
2. パブリックAPIと型を特定
3. インストール、使い方、APIリファレンス付きREADME.mdを生成
4. 詳細ドキュメント用のdocs/フォルダを作成

## バッチ処理

複数のGitHub課題を並列処理。`ct auto`（スマートモード）または `ct batch`（手動モード）を使用:

```bash
# Auto: オープンIssueをスマートな競合検出付きで取得
ct auto --label bug --parallel 3
ct auto --label high-priority --parallel 5

# Manual: 特定のIssueを指定
ct batch 101 102 103
ct batch --label bug --limit 10
```

### Auto/Batchオプション

| オプション | 説明 |
|------------|------|
| `--label <label>` | GitHubラベルで課題をフィルタリング |
| `--parallel <n>` | 並列セッション数（デフォルト: 3） |
| `--max-cost <usd>` | セッションごとの予算上限 |
| `--dry-run` | セッション開始せずに課題プレビュー |

### 機能

- **競合検出**: 同じファイルを変更する課題を自動検出、順次実行
- **PRフィルタリング**: 既にオープンPRがある課題をスキップ
- **進捗追跡**: すべてのセッションのリアルタイム状態更新
- **優雅な処理**: 一部のセッションが失敗しても処理を継続

## 依存関係チェーン (NEW)

複数の課題を連結して、前のブランチを基に次の課題を実行:

```bash
# 課題 10 → 11 → 12 を順次実行
# 課題11はissue-10ブランチから、課題12はissue-11ブランチから開始
ct chain 10 11 12

# チェーン計画をプレビュー
ct chain 10 11 12 --dry-run

# すべての課題にテンプレートを適用
ct chain 10 11 12 --template feature

# 失敗しても続行
ct chain 10 11 12 --skip-failed
```

### 動作原理

```
Issue #10 (base: develop)
    ↓ 完了
Issue #11 (base: issue-10)
    ↓ 完了
Issue #12 (base: issue-11)
    ↓ 完了
```

ユースケース:
- **順次機能**: DBスキーマ → API → UI変更
- **依存性のある修正**: コア修正 → 関連修正
- **段階的リファクタリング**: ステップバイステップの改善作業

### Chainオプション

| オプション | 説明 |
|------------|------|
| `--template <template>` | すべての課題に適用するセッションテンプレート |
| `--skip-failed` | 課題が失敗してもチェーンを継続 |
| `--base-branch <branch>` | 最初の課題のベースブランチ（デフォルト: develop） |
| `--dry-run` | 実行せずにチェーン計画をプレビュー |

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

| 機能 | Claude Code | claudetree |
|------|-------------|------------|
| 並列セッション | 一度に1つ | 無制限並列 |
| Issue-to-PRパイプライン | 手動コピペ | `ct start <url>` |
| コスト追跡 | 現在のセッションのみ | セッション別 + 分析 (`ct stats`) |
| バッチ処理 | N/A | `ct batch` / `ct auto` |
| 依存関係チェーン | N/A | `ct chain` |
| セッションログ | ターミナルスクロール | `ct log` + Webダッシュボード |
| コンテキスト分離 | 共有ディレクトリ | 別worktree |
| 進捗監視 | ターミナルのみ | CLI + Webダッシュボード |

## 制限事項

- **トークンコスト**: 自律セッションは相当なトークンを消費（`--max-cost`で制限）
- **Claude可用性**: Claude Code CLIのインストールが必要（`ct doctor`で確認）
- **Git worktrees**: プロジェクトがgitリポジトリである必要
- **GitHub統合**: 現在、課題取得はGitHubのみサポート

## 貢献

開発ガイドラインは[CONTRIBUTING.md](CONTRIBUTING.md)を参照してください。

## ライセンス

MIT

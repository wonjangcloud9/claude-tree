'use client';

import { CodeBlock } from '@/components/docs/CodeBlock';

export default function DocsPage() {
  return (
    <article>
      {/* Introduction */}
      <section id="getting-started" style={{ marginBottom: '64px' }}>
        <h1
          style={{
            fontSize: '36px',
            fontWeight: 700,
            marginBottom: '16px',
            lineHeight: 1.2,
          }}
        >
          claudetree Documentation
        </h1>
        <p
          style={{
            fontSize: '18px',
            color: 'var(--text-secondary)',
            marginBottom: '32px',
            lineHeight: 1.7,
          }}
        >
          Git Worktree-based Claude Code multi-session manager for parallel AI-assisted development.
        </p>

        <div
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '32px',
          }}
        >
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Key Features</h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
            <li>Isolated Git worktrees for each Claude session</li>
            <li>Parallel session management with batch processing</li>
            <li>Real-time WebSocket dashboard</li>
            <li>Session templates for consistent workflows</li>
            <li>Slack notifications for session status</li>
            <li>GitHub integration for issue-driven development</li>
          </ul>
        </div>

        <h2 id="introduction" style={sectionTitle}>Introduction</h2>
        <p style={paragraph}>
          <strong>claudetree</strong> enables developers to run multiple Claude Code sessions simultaneously,
          each in its own isolated Git worktree. This allows for parallel development on different issues
          without branch switching or merge conflicts.
        </p>

        <h3 style={subSectionTitle}>How It Works</h3>
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '24px',
            fontFamily: 'monospace',
            fontSize: '13px',
            lineHeight: 1.8,
          }}
        >
          <pre style={{ margin: 0 }}>{`┌─────────────────────────────────────────────────────────────┐
│                      Main Repository                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │Worktree │  │Worktree │  │Worktree │  │Worktree │         │
│  │issue-42 │  │issue-43 │  │issue-44 │  │feature-x│         │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘         │
│       │            │            │            │               │
│  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐         │
│  │ Claude  │  │ Claude  │  │ Claude  │  │ Claude  │         │
│  │Session 1│  │Session 2│  │Session 3│  │Session 4│         │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘         │
└─────────────────────────────────────────────────────────────┘`}</pre>
        </div>

        <h2 id="installation" style={sectionTitle}>Installation</h2>

        <h3 style={subSectionTitle}>Prerequisites</h3>
        <ul style={list}>
          <li>Node.js 18+ (LTS recommended)</li>
          <li>pnpm 8+ (package manager)</li>
          <li>Git 2.20+ (worktree support)</li>
          <li>Claude CLI (Anthropic CLI tool)</li>
        </ul>

        <h3 style={subSectionTitle}>Install from npm</h3>
        <CodeBlock
          code="npm install -g @claudetree/cli"
          language="bash"
        />

        <h3 style={subSectionTitle}>Install from Source</h3>
        <CodeBlock
          code={`git clone https://github.com/claudetree/claudetree.git
cd claudetree
pnpm install
pnpm build
pnpm link --global`}
          language="bash"
        />

        <h3 style={subSectionTitle}>Verify Installation</h3>
        <CodeBlock
          code={`claudetree --version
# or use the alias
ct --version`}
          language="bash"
        />

        <h2 id="quick-start" style={sectionTitle}>Quick Start</h2>

        <h3 style={subSectionTitle}>1. Initialize in Your Project</h3>
        <CodeBlock
          code={`cd your-project
ct init`}
          language="bash"
        />
        <p style={paragraph}>
          This creates a <code style={inlineCode}>.claudetree/</code> directory with configuration and templates.
        </p>

        <h3 style={subSectionTitle}>2. Start a Session</h3>
        <CodeBlock
          code={`# Start with issue number
ct start 42

# Start with GitHub URL
ct start https://github.com/owner/repo/issues/42

# Start with custom task name
ct start refactor-auth`}
          language="bash"
        />

        <h3 style={subSectionTitle}>3. View Dashboard</h3>
        <CodeBlock
          code="ct web"
          language="bash"
        />
        <p style={paragraph}>
          Opens the web dashboard at <code style={inlineCode}>http://localhost:3000</code> showing all active sessions.
        </p>
      </section>

      {/* CLI Reference */}
      <section id="cli-reference" style={{ marginBottom: '64px' }}>
        <h1 style={pageTitle}>CLI Reference</h1>
        <p style={paragraph}>
          Complete reference for all claudetree CLI commands.
        </p>

        <h2 id="ct-init" style={sectionTitle}>ct init</h2>
        <p style={paragraph}>Initialize claudetree in the current Git repository.</p>
        <CodeBlock
          code={`ct init [options]

Options:
  -d, --worktree-dir <dir>   Base directory for worktrees (default: ".worktrees")
  -f, --force                Overwrite existing configuration
  --slack <webhook-url>      Slack webhook URL for notifications`}
          language="bash"
        />

        <h4 style={subSectionTitle}>Example</h4>
        <CodeBlock
          code={`# Basic initialization
ct init

# Custom worktree directory
ct init --worktree-dir ./sessions

# With Slack notifications
ct init --slack https://hooks.slack.com/services/XXX/YYY/ZZZ`}
          language="bash"
        />

        <h4 style={subSectionTitle}>Generated Structure</h4>
        <CodeBlock
          code={`.claudetree/
├── config.json           # Main configuration
├── sessions.json         # Session registry
├── templates/            # Session templates
│   ├── bugfix.json
│   ├── feature.json
│   ├── refactor.json
│   └── review.json
└── events/               # Session event logs`}
          language="text"
          filename=".claudetree/"
        />

        <h2 id="ct-start" style={sectionTitle}>ct start</h2>
        <p style={paragraph}>Create a worktree and start a Claude session.</p>
        <CodeBlock
          code={`ct start <issue> [options]

Arguments:
  issue                      Issue number, GitHub URL, or task name

Options:
  -p, --prompt <prompt>      Initial prompt for Claude
  --no-session               Create worktree without starting Claude
  -s, --skill <skill>        Skill to activate (tdd, review)
  -T, --template <template>  Session template (bugfix, feature, refactor, review)
  -b, --branch <branch>      Custom branch name
  -t, --token <token>        GitHub token (or use GITHUB_TOKEN env)`}
          language="bash"
        />

        <h4 style={subSectionTitle}>Examples</h4>
        <CodeBlock
          code={`# Start with issue number (fetches from GitHub if configured)
ct start 42

# Start with template
ct start 42 --template bugfix

# Start with TDD skill
ct start 42 --skill tdd

# Start with custom prompt
ct start 42 --prompt "Focus on unit tests only"

# Create worktree only, don't start Claude
ct start 42 --no-session

# Custom branch name
ct start 42 --branch fix/login-validation`}
          language="bash"
        />

        <h2 id="ct-batch" style={sectionTitle}>ct batch</h2>
        <p style={paragraph}>Start multiple Claude sessions in parallel.</p>
        <CodeBlock
          code={`ct batch [issues...] [options]

Arguments:
  issues                     Issue numbers or GitHub URLs

Options:
  -l, --label <label>        Filter GitHub issues by label
  -n, --limit <number>       Maximum issues to process (default: 5)
  -T, --template <template>  Session template to use
  -t, --token <token>        GitHub token
  -f, --file <file>          Read issues from file (one per line)
  -P, --parallel <number>    Parallel session count (default: 3)
  --dry-run                  Show what would be started`}
          language="bash"
        />

        <h4 style={subSectionTitle}>Examples</h4>
        <CodeBlock
          code={`# Start multiple issues
ct batch 42 43 44 45

# Process issues by label
ct batch --label "good first issue" --limit 10

# From file with template
ct batch --file issues.txt --template bugfix

# Dry run to preview
ct batch --label bug --dry-run

# Limit parallel sessions
ct batch 42 43 44 45 46 47 --parallel 2`}
          language="bash"
        />

        <h4 style={subSectionTitle}>Issues File Format</h4>
        <CodeBlock
          code={`# issues.txt - Comments start with #
42
43
https://github.com/owner/repo/issues/44
45`}
          language="text"
          filename="issues.txt"
        />

        <h2 id="ct-bustercall" style={sectionTitle}>ct bustercall</h2>
        <p style={paragraph}>
          Auto-fetch all open GitHub issues and start parallel Claude sessions.
          Unlike <code>ct batch</code>, this command automatically fetches issues from GitHub.
        </p>
        <CodeBlock
          code={`ct bustercall [options]

Options:
  -l, --label <label>        Filter by GitHub label (comma-separated for AND)
  -n, --limit <number>       Maximum issues to process (default: 10)
  -P, --parallel <number>    Number of parallel sessions (default: 3)
  -T, --template <template>  Session template to use
  -t, --token <token>        GitHub token (or use GITHUB_TOKEN env)
  -e, --exclude <numbers>    Exclude issue numbers (comma-separated)
  --dry-run                  Show target issues without starting`}
          language="bash"
        />

        <h4 style={subSectionTitle}>Examples</h4>
        <CodeBlock
          code={`# Process all open issues (up to 10)
ct bustercall

# Filter by label
ct bustercall --label bug

# Preview target issues
ct bustercall --dry-run

# 5 parallel sessions with bugfix template
ct bustercall -P 5 --template bugfix

# Exclude specific issues
ct bustercall --exclude 101,102,103`}
          language="bash"
        />

        <h4 style={subSectionTitle}>Requirements</h4>
        <p style={paragraph}>
          Requires GitHub configuration in <code>.claudetree/config.json</code>:
        </p>
        <CodeBlock
          code={`{
  "github": {
    "owner": "your-username",
    "repo": "your-repo"
  }
}`}
          language="json"
          filename="config.json"
        />

        <h2 id="ct-resume" style={sectionTitle}>ct resume</h2>
        <p style={paragraph}>Resume a paused session.</p>
        <CodeBlock
          code={`ct resume <session-id>

Arguments:
  session-id    Session ID (full or prefix match)`}
          language="bash"
        />

        <h4 style={subSectionTitle}>Example</h4>
        <CodeBlock
          code={`# Resume with full ID
ct resume a1b2c3d4-e5f6-7890-abcd-ef1234567890

# Resume with prefix
ct resume a1b2c3d4`}
          language="bash"
        />

        <h2 id="ct-status" style={sectionTitle}>ct status</h2>
        <p style={paragraph}>Show status of all sessions.</p>
        <CodeBlock
          code={`ct status [options]

Options:
  -a, --all      Show all sessions (including completed)
  --json         Output as JSON`}
          language="bash"
        />

        <h4 style={subSectionTitle}>Example Output</h4>
        <CodeBlock
          code={`$ ct status
SESSION ID   ISSUE   STATUS     BRANCH           CREATED
a1b2c3d4     #42     running    issue-42-fix     5 min ago
e5f6g7h8     #43     paused     issue-43-feat    2 hours ago
i9j0k1l2     #44     completed  issue-44-test    1 day ago`}
          language="text"
        />

        <h2 id="ct-list" style={sectionTitle}>ct list</h2>
        <p style={paragraph}>List all worktrees managed by claudetree.</p>
        <CodeBlock
          code="ct list"
          language="bash"
        />

        <h2 id="ct-stop" style={sectionTitle}>ct stop</h2>
        <p style={paragraph}>Stop a running session.</p>
        <CodeBlock
          code={`ct stop <session-id>

Options:
  --force    Force stop without graceful shutdown`}
          language="bash"
        />

        <h2 id="ct-web" style={sectionTitle}>ct web</h2>
        <p style={paragraph}>Start the web dashboard.</p>
        <CodeBlock
          code={`ct web [options]

Options:
  -p, --port <port>    Port number (default: 3000)
  --no-open            Don't open browser automatically`}
          language="bash"
        />
      </section>

      {/* Configuration */}
      <section id="configuration" style={{ marginBottom: '64px' }}>
        <h1 style={pageTitle}>Configuration</h1>

        <h2 id="config-json" style={sectionTitle}>config.json</h2>
        <p style={paragraph}>
          Main configuration file located at <code style={inlineCode}>.claudetree/config.json</code>.
        </p>
        <CodeBlock
          code={`{
  "version": "0.1.0",
  "worktreeDir": ".worktrees",
  "github": {
    "owner": "your-org",
    "repo": "your-repo",
    "token": "ghp_xxxx"  // Or use GITHUB_TOKEN env
  },
  "slack": {
    "webhookUrl": "https://hooks.slack.com/services/XXX/YYY/ZZZ"
  }
}`}
          language="json"
          filename=".claudetree/config.json"
          showLineNumbers
        />

        <h3 style={subSectionTitle}>Configuration Options</h3>
        <table style={table}>
          <thead>
            <tr>
              <th style={tableHeader}>Option</th>
              <th style={tableHeader}>Type</th>
              <th style={tableHeader}>Default</th>
              <th style={tableHeader}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tableCell}><code style={inlineCode}>version</code></td>
              <td style={tableCell}>string</td>
              <td style={tableCell}>"0.1.0"</td>
              <td style={tableCell}>Config schema version</td>
            </tr>
            <tr>
              <td style={tableCell}><code style={inlineCode}>worktreeDir</code></td>
              <td style={tableCell}>string</td>
              <td style={tableCell}>".worktrees"</td>
              <td style={tableCell}>Directory for Git worktrees</td>
            </tr>
            <tr>
              <td style={tableCell}><code style={inlineCode}>github.owner</code></td>
              <td style={tableCell}>string</td>
              <td style={tableCell}>-</td>
              <td style={tableCell}>GitHub organization/user</td>
            </tr>
            <tr>
              <td style={tableCell}><code style={inlineCode}>github.repo</code></td>
              <td style={tableCell}>string</td>
              <td style={tableCell}>-</td>
              <td style={tableCell}>GitHub repository name</td>
            </tr>
            <tr>
              <td style={tableCell}><code style={inlineCode}>github.token</code></td>
              <td style={tableCell}>string</td>
              <td style={tableCell}>-</td>
              <td style={tableCell}>GitHub personal access token</td>
            </tr>
            <tr>
              <td style={tableCell}><code style={inlineCode}>slack.webhookUrl</code></td>
              <td style={tableCell}>string</td>
              <td style={tableCell}>-</td>
              <td style={tableCell}>Slack incoming webhook URL</td>
            </tr>
          </tbody>
        </table>

        <h2 id="github-integration" style={sectionTitle}>GitHub Integration</h2>
        <p style={paragraph}>
          Configure GitHub to automatically fetch issue details when starting sessions.
        </p>

        <h3 style={subSectionTitle}>Personal Access Token</h3>
        <p style={paragraph}>
          Create a token at GitHub → Settings → Developer settings → Personal access tokens
        </p>
        <p style={paragraph}>Required scopes:</p>
        <ul style={list}>
          <li><code style={inlineCode}>repo</code> - Full control of private repositories</li>
          <li><code style={inlineCode}>read:org</code> - Read org membership (for org repos)</li>
        </ul>

        <h3 style={subSectionTitle}>Environment Variable</h3>
        <CodeBlock
          code={`# .env or shell profile
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx`}
          language="bash"
        />

        <h2 id="slack-notifications" style={sectionTitle}>Slack Notifications</h2>
        <p style={paragraph}>
          Receive notifications when sessions complete or fail.
        </p>

        <h3 style={subSectionTitle}>Setup Webhook</h3>
        <ol style={list}>
          <li>Go to <a href="https://api.slack.com/apps" target="_blank">Slack API</a></li>
          <li>Create New App → From Scratch</li>
          <li>Incoming Webhooks → Activate</li>
          <li>Add New Webhook to Workspace</li>
          <li>Copy the Webhook URL</li>
        </ol>

        <h3 style={subSectionTitle}>Notification Types</h3>
        <table style={table}>
          <thead>
            <tr>
              <th style={tableHeader}>Event</th>
              <th style={tableHeader}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tableCell}>Session Started</td>
              <td style={tableCell}>When a new Claude session begins</td>
            </tr>
            <tr>
              <td style={tableCell}>Session Completed</td>
              <td style={tableCell}>When Claude finishes successfully</td>
            </tr>
            <tr>
              <td style={tableCell}>Session Failed</td>
              <td style={tableCell}>When an error occurs</td>
            </tr>
            <tr>
              <td style={tableCell}>Batch Complete</td>
              <td style={tableCell}>Summary after batch processing</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Session Templates */}
      <section id="session-templates" style={{ marginBottom: '64px' }}>
        <h1 style={pageTitle}>Session Templates</h1>
        <p style={paragraph}>
          Templates define reusable configurations for Claude sessions, including prompts and behaviors.
        </p>

        <h2 id="built-in-templates" style={sectionTitle}>Built-in Templates</h2>

        <h3 style={subSectionTitle}>bugfix</h3>
        <p style={paragraph}>For bug fixes with TDD approach.</p>
        <CodeBlock
          code={`{
  "name": "Bug Fix",
  "description": "Fix bugs using Test-Driven Development",
  "skill": "tdd",
  "promptPrefix": "You are fixing a bug. Follow TDD: write a failing test first.",
  "promptSuffix": "Ensure all tests pass before committing."
}`}
          language="json"
          filename="templates/bugfix.json"
        />

        <h3 style={subSectionTitle}>feature</h3>
        <p style={paragraph}>For implementing new features.</p>
        <CodeBlock
          code={`{
  "name": "Feature",
  "description": "Implement new features",
  "promptPrefix": "You are implementing a new feature.",
  "promptSuffix": "Write tests and documentation for new functionality."
}`}
          language="json"
          filename="templates/feature.json"
        />

        <h3 style={subSectionTitle}>refactor</h3>
        <p style={paragraph}>For code refactoring without behavior changes.</p>
        <CodeBlock
          code={`{
  "name": "Refactor",
  "description": "Refactor code without changing behavior",
  "promptPrefix": "You are refactoring code. Do not change external behavior.",
  "promptSuffix": "Verify all existing tests still pass."
}`}
          language="json"
          filename="templates/refactor.json"
        />

        <h3 style={subSectionTitle}>review</h3>
        <p style={paragraph}>For code review mode.</p>
        <CodeBlock
          code={`{
  "name": "Code Review",
  "description": "Review code for quality and security",
  "skill": "review",
  "systemPrompt": "Review code thoroughly for security, quality, and best practices."
}`}
          language="json"
          filename="templates/review.json"
        />

        <h2 id="custom-templates" style={sectionTitle}>Custom Templates</h2>
        <p style={paragraph}>
          Create custom templates in <code style={inlineCode}>.claudetree/templates/</code>.
        </p>
        <CodeBlock
          code={`{
  "name": "API Endpoint",
  "description": "Create new REST API endpoint",
  "promptPrefix": "You are creating a new REST API endpoint.",
  "promptSuffix": "Include: route, controller, service, validation, tests, OpenAPI docs.",
  "systemPrompt": "Follow REST best practices. Use proper HTTP status codes.",
  "allowedTools": ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
}`}
          language="json"
          filename="templates/api-endpoint.json"
        />

        <h3 style={subSectionTitle}>Usage</h3>
        <CodeBlock
          code={`# Use custom template
ct start 42 --template api-endpoint`}
          language="bash"
        />

        <h2 id="template-schema" style={sectionTitle}>Template Schema</h2>
        <CodeBlock
          code={`interface SessionTemplate {
  name: string;              // Display name
  description?: string;      // Template description
  promptPrefix?: string;     // Prepended to issue prompt
  promptSuffix?: string;     // Appended to issue prompt
  systemPrompt?: string;     // Claude system prompt override
  skill?: 'tdd' | 'review';  // Pre-defined skill mode
  allowedTools?: string[];   // Restrict available tools
}`}
          language="typescript"
          filename="types/template.ts"
        />
      </section>

      {/* Architecture */}
      <section id="architecture" style={{ marginBottom: '64px' }}>
        <h1 style={pageTitle}>Architecture</h1>

        <h2 id="project-structure" style={sectionTitle}>Project Structure</h2>
        <CodeBlock
          code={`claudetree/
├── packages/
│   ├── cli/                 # Command-line interface
│   │   └── src/
│   │       ├── commands/    # CLI commands (init, start, batch...)
│   │       └── index.ts     # Entry point
│   │
│   ├── core/                # Business logic
│   │   └── src/
│   │       ├── domain/      # Domain entities
│   │       ├── application/ # Use cases / services
│   │       └── infra/       # Infrastructure adapters
│   │
│   ├── shared/              # Shared types
│   │   └── src/types/       # TypeScript interfaces
│   │
│   └── web/                 # Next.js dashboard
│       └── src/
│           ├── app/         # App router pages
│           └── components/  # React components
│
├── pnpm-workspace.yaml      # Monorepo config
└── package.json             # Root package`}
          language="text"
        />

        <h2 id="package-overview" style={sectionTitle}>Package Overview</h2>

        <h3 style={subSectionTitle}>@claudetree/cli</h3>
        <p style={paragraph}>
          Command-line interface built with Commander.js. Handles user commands
          and orchestrates core functionality.
        </p>

        <h3 style={subSectionTitle}>@claudetree/core</h3>
        <p style={paragraph}>
          Core business logic following Clean Architecture principles:
        </p>
        <ul style={list}>
          <li><strong>Domain:</strong> Session, Worktree, Event entities</li>
          <li><strong>Application:</strong> WorktreeSyncService, session management</li>
          <li><strong>Infrastructure:</strong> Git, Claude, GitHub, Slack adapters</li>
        </ul>

        <h3 style={subSectionTitle}>@claudetree/shared</h3>
        <p style={paragraph}>
          Shared TypeScript types used across all packages.
        </p>

        <h3 style={subSectionTitle}>@claudetree/web</h3>
        <p style={paragraph}>
          Next.js 15 dashboard with real-time WebSocket updates.
        </p>

        <h2 id="data-flow" style={sectionTitle}>Data Flow</h2>
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '24px',
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: 1.8,
            overflowX: 'auto',
          }}
        >
          <pre style={{ margin: 0 }}>{`┌──────────┐     ┌──────────┐     ┌──────────────┐
│   CLI    │────▶│   Core   │────▶│ Git Worktree │
│ Commands │     │ Services │     │   Adapter    │
└──────────┘     └──────────┘     └──────────────┘
                      │
                      ▼
               ┌──────────────┐
               │    Claude    │
               │   Adapter    │
               └──────────────┘
                      │
                      ▼
               ┌──────────────┐     ┌──────────────┐
               │   Session    │────▶│  WebSocket   │
               │  Repository  │     │   Server     │
               └──────────────┘     └──────────────┘
                                          │
                                          ▼
                                    ┌──────────────┐
                                    │     Web      │
                                    │  Dashboard   │
                                    └──────────────┘`}</pre>
        </div>
      </section>

      {/* API Reference */}
      <section id="api-reference" style={{ marginBottom: '64px' }}>
        <h1 style={pageTitle}>API Reference</h1>

        <h2 id="rest-endpoints" style={sectionTitle}>REST Endpoints</h2>

        <h3 style={subSectionTitle}>Sessions</h3>
        <table style={table}>
          <thead>
            <tr>
              <th style={tableHeader}>Method</th>
              <th style={tableHeader}>Endpoint</th>
              <th style={tableHeader}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tableCell}><code style={inlineCode}>GET</code></td>
              <td style={tableCell}>/api/sessions</td>
              <td style={tableCell}>List all sessions</td>
            </tr>
            <tr>
              <td style={tableCell}><code style={inlineCode}>POST</code></td>
              <td style={tableCell}>/api/sessions</td>
              <td style={tableCell}>Create new session</td>
            </tr>
            <tr>
              <td style={tableCell}><code style={inlineCode}>GET</code></td>
              <td style={tableCell}>/api/sessions/:id</td>
              <td style={tableCell}>Get session details</td>
            </tr>
            <tr>
              <td style={tableCell}><code style={inlineCode}>DELETE</code></td>
              <td style={tableCell}>/api/sessions/:id</td>
              <td style={tableCell}>Delete session</td>
            </tr>
            <tr>
              <td style={tableCell}><code style={inlineCode}>GET</code></td>
              <td style={tableCell}>/api/sessions/:id/events</td>
              <td style={tableCell}>Get session events</td>
            </tr>
            <tr>
              <td style={tableCell}><code style={inlineCode}>GET</code></td>
              <td style={tableCell}>/api/sessions/:id/approvals</td>
              <td style={tableCell}>Get tool approvals</td>
            </tr>
            <tr>
              <td style={tableCell}><code style={inlineCode}>PATCH</code></td>
              <td style={tableCell}>/api/sessions/:id/approvals/:aid</td>
              <td style={tableCell}>Update approval status</td>
            </tr>
          </tbody>
        </table>

        <h3 style={subSectionTitle}>Example: List Sessions</h3>
        <CodeBlock
          code={`curl http://localhost:3000/api/sessions

# Response
{
  "sessions": [
    {
      "id": "a1b2c3d4-...",
      "status": "running",
      "issueNumber": 42,
      "worktreeId": "...",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}`}
          language="bash"
        />

        <h2 id="websocket-events" style={sectionTitle}>WebSocket Events</h2>
        <p style={paragraph}>
          Connect to <code style={inlineCode}>ws://localhost:3001</code> for real-time updates.
        </p>

        <h3 style={subSectionTitle}>Event Types</h3>
        <CodeBlock
          code={`// Session updated
{
  "type": "session:updated",
  "payload": {
    "sessionId": "a1b2c3d4-...",
    "status": "running"
  }
}

// New output
{
  "type": "output:new",
  "payload": {
    "sessionId": "a1b2c3d4-...",
    "content": "Implementing feature...",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}

// Approval required
{
  "type": "approval:required",
  "payload": {
    "sessionId": "a1b2c3d4-...",
    "approvalId": "...",
    "toolName": "Bash",
    "parameters": { "command": "npm test" }
  }
}`}
          language="json"
        />

        <h2 id="typescript-types" style={sectionTitle}>TypeScript Types</h2>

        <h3 style={subSectionTitle}>Session</h3>
        <CodeBlock
          code={`interface Session {
  id: string;
  worktreeId: string;
  claudeSessionId: string | null;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  issueNumber: number | null;
  prompt: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Recovery fields
  processId: string | null;
  osProcessId: number | null;
  lastHeartbeat: Date | null;
  errorCount: number;
  worktreePath: string | null;
}`}
          language="typescript"
          filename="types/session.ts"
          showLineNumbers
        />

        <h3 style={subSectionTitle}>Event</h3>
        <CodeBlock
          code={`type EventType = 'output' | 'tool_call' | 'approval' | 'error' | 'completion';

interface Event {
  id: string;
  sessionId: string;
  type: EventType;
  content: string;
  timestamp: Date;
}`}
          language="typescript"
          filename="types/event.ts"
        />

        <h3 style={subSectionTitle}>ToolApproval</h3>
        <CodeBlock
          code={`type ApprovalStatus = 'pending' | 'approved' | 'rejected';

interface ToolApproval {
  id: string;
  sessionId: string;
  toolName: string;
  parameters: Record<string, unknown>;
  status: ApprovalStatus;
  approvedBy: string | null;
  requestedAt: Date;
  resolvedAt: Date | null;
}`}
          language="typescript"
          filename="types/tool-approval.ts"
        />
      </section>

      {/* Advanced */}
      <section id="advanced" style={{ marginBottom: '64px' }}>
        <h1 style={pageTitle}>Advanced Topics</h1>

        <h2 id="git-worktree-strategy" style={sectionTitle}>Git Worktree Strategy</h2>
        <p style={paragraph}>
          claudetree uses Git worktrees to isolate each session in its own directory
          with a separate working copy.
        </p>

        <h3 style={subSectionTitle}>Benefits</h3>
        <ul style={list}>
          <li><strong>Isolation:</strong> Each session has independent file changes</li>
          <li><strong>No conflicts:</strong> Multiple sessions can modify same files</li>
          <li><strong>Fast switching:</strong> No need to stash/checkout</li>
          <li><strong>Shared history:</strong> All worktrees share the same Git history</li>
        </ul>

        <h3 style={subSectionTitle}>Cleanup</h3>
        <CodeBlock
          code={`# List all worktrees
git worktree list

# Remove a worktree
git worktree remove .worktrees/issue-42

# Prune stale worktrees
git worktree prune`}
          language="bash"
        />

        <h2 id="parallel-sessions" style={sectionTitle}>Parallel Sessions</h2>
        <p style={paragraph}>
          Best practices for running multiple Claude sessions simultaneously.
        </p>

        <h3 style={subSectionTitle}>Resource Considerations</h3>
        <ul style={list}>
          <li>Each Claude session uses ~500MB-1GB memory</li>
          <li>Network bandwidth for API calls</li>
          <li>Disk space for worktrees (~2x repo size per worktree)</li>
        </ul>

        <h3 style={subSectionTitle}>Recommended Limits</h3>
        <table style={table}>
          <thead>
            <tr>
              <th style={tableHeader}>System RAM</th>
              <th style={tableHeader}>Max Parallel Sessions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tableCell}>8 GB</td>
              <td style={tableCell}>2-3</td>
            </tr>
            <tr>
              <td style={tableCell}>16 GB</td>
              <td style={tableCell}>4-6</td>
            </tr>
            <tr>
              <td style={tableCell}>32 GB+</td>
              <td style={tableCell}>8-10</td>
            </tr>
          </tbody>
        </table>

        <h2 id="error-handling" style={sectionTitle}>Error Handling</h2>

        <h3 style={subSectionTitle}>Common Errors</h3>

        <h4 style={{ ...subSectionTitle, fontSize: '14px' }}>Claude CLI Not Found</h4>
        <CodeBlock
          code={`Error: Claude CLI not found. Install it first.

# Solution: Install Claude CLI
npm install -g @anthropic-ai/claude-cli`}
          language="text"
        />

        <h4 style={{ ...subSectionTitle, fontSize: '14px' }}>Branch Already Exists</h4>
        <CodeBlock
          code={`Error: Branch 'issue-42' already exists.

# Solution 1: Use existing worktree
ct start 42  # Will reuse existing

# Solution 2: Custom branch name
ct start 42 --branch issue-42-retry`}
          language="text"
        />

        <h4 style={{ ...subSectionTitle, fontSize: '14px' }}>GitHub Token Invalid</h4>
        <CodeBlock
          code={`Error: Failed to fetch issue. Bad credentials

# Solution: Check token permissions
export GITHUB_TOKEN=ghp_valid_token_here`}
          language="text"
        />

        <h3 style={subSectionTitle}>Session Recovery</h3>
        <p style={paragraph}>
          If a session crashes or is interrupted, use the resume command:
        </p>
        <CodeBlock
          code={`# List paused sessions
ct status

# Resume specific session
ct resume a1b2c3d4`}
          language="bash"
        />
      </section>

      {/* Footer */}
      <footer
        style={{
          marginTop: '64px',
          paddingTop: '32px',
          borderTop: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          fontSize: '14px',
        }}
      >
        <p>
          claudetree is open source software. Contributions welcome on{' '}
          <a href="https://github.com/claudetree/claudetree" target="_blank" rel="noopener">
            GitHub
          </a>.
        </p>
      </footer>
    </article>
  );
}

// Shared styles
const pageTitle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  marginBottom: '16px',
  paddingBottom: '16px',
  borderBottom: '1px solid var(--border)',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 600,
  marginTop: '48px',
  marginBottom: '16px',
  scrollMarginTop: '80px',
};

const subSectionTitle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  marginTop: '24px',
  marginBottom: '12px',
  color: 'var(--text-primary)',
};

const paragraph: React.CSSProperties = {
  marginBottom: '16px',
  color: 'var(--text-secondary)',
  lineHeight: 1.7,
};

const list: React.CSSProperties = {
  marginBottom: '16px',
  paddingLeft: '24px',
  color: 'var(--text-secondary)',
  lineHeight: 1.8,
};

const inlineCode: React.CSSProperties = {
  background: 'var(--bg-tertiary)',
  padding: '2px 6px',
  borderRadius: '4px',
  fontSize: '13px',
  fontFamily: 'monospace',
};

const table: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginBottom: '24px',
  fontSize: '14px',
};

const tableHeader: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px',
  borderBottom: '2px solid var(--border)',
  fontWeight: 600,
};

const tableCell: React.CSSProperties = {
  padding: '12px',
  borderBottom: '1px solid var(--border)',
  color: 'var(--text-secondary)',
};

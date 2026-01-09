'use client';

import { CodeBlock } from './CodeBlock';
import {
  sectionContainer,
  sectionTitle,
  subSectionTitle,
  paragraph,
  list,
  inlineCode,
  featureBox,
  diagramBox,
  heroTitle,
  heroSubtitle,
} from './docsStyles';

export function GettingStartedSection() {
  return (
    <section id="getting-started" style={sectionContainer}>
      <h1 style={heroTitle}>claudetree Documentation</h1>
      <p style={heroSubtitle}>
        Git Worktree-based Claude Code multi-session manager for parallel AI-assisted development.
      </p>

      <div style={featureBox}>
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

      <h2 id="introduction" style={sectionTitle}>
        Introduction
      </h2>
      <p style={paragraph}>
        <strong>claudetree</strong> enables developers to run multiple Claude Code sessions
        simultaneously, each in its own isolated Git worktree. This allows for parallel development
        on different issues without branch switching or merge conflicts.
      </p>

      <h3 style={subSectionTitle}>How It Works</h3>
      <div style={diagramBox}>
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

      <h2 id="installation" style={sectionTitle}>
        Installation
      </h2>

      <h3 style={subSectionTitle}>Prerequisites</h3>
      <ul style={list}>
        <li>Node.js 18+ (LTS recommended)</li>
        <li>pnpm 8+ (package manager)</li>
        <li>Git 2.20+ (worktree support)</li>
        <li>Claude CLI (Anthropic CLI tool)</li>
      </ul>

      <h3 style={subSectionTitle}>Install from npm</h3>
      <CodeBlock code="npm install -g @claudetree/cli" language="bash" />

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

      <h2 id="quick-start" style={sectionTitle}>
        Quick Start
      </h2>

      <h3 style={subSectionTitle}>1. Initialize in Your Project</h3>
      <CodeBlock
        code={`cd your-project
ct init`}
        language="bash"
      />
      <p style={paragraph}>
        This creates a <code style={inlineCode}>.claudetree/</code> directory with configuration and
        templates.
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
      <CodeBlock code="ct web" language="bash" />
      <p style={paragraph}>
        Opens the web dashboard at <code style={inlineCode}>http://localhost:3000</code> showing all
        active sessions.
      </p>
    </section>
  );
}

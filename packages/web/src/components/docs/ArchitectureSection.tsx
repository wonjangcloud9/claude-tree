'use client';

import { CodeBlock } from './CodeBlock';
import {
  sectionContainer,
  pageTitle,
  sectionTitle,
  subSectionTitle,
  paragraph,
  list,
  diagramBox,
} from './docsStyles';

export function ArchitectureSection() {
  return (
    <section id="architecture" style={sectionContainer}>
      <h1 style={pageTitle}>Architecture</h1>

      <h2 id="project-structure" style={sectionTitle}>
        Project Structure
      </h2>
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

      <h2 id="package-overview" style={sectionTitle}>
        Package Overview
      </h2>

      <h3 style={subSectionTitle}>@claudetree/cli</h3>
      <p style={paragraph}>
        Command-line interface built with Commander.js. Handles user commands and orchestrates core
        functionality.
      </p>

      <h3 style={subSectionTitle}>@claudetree/core</h3>
      <p style={paragraph}>Core business logic following Clean Architecture principles:</p>
      <ul style={list}>
        <li>
          <strong>Domain:</strong> Session, Worktree, Event entities
        </li>
        <li>
          <strong>Application:</strong> WorktreeSyncService, session management
        </li>
        <li>
          <strong>Infrastructure:</strong> Git, Claude, GitHub, Slack adapters
        </li>
      </ul>

      <h3 style={subSectionTitle}>@claudetree/shared</h3>
      <p style={paragraph}>Shared TypeScript types used across all packages.</p>

      <h3 style={subSectionTitle}>@claudetree/web</h3>
      <p style={paragraph}>Next.js 15 dashboard with real-time WebSocket updates.</p>

      <h2 id="data-flow" style={sectionTitle}>
        Data Flow
      </h2>
      <div style={diagramBox}>
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
  );
}

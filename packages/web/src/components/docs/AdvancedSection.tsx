'use client';

import { CodeBlock } from './CodeBlock';
import {
  sectionContainer,
  pageTitle,
  sectionTitle,
  subSectionTitle,
  paragraph,
  list,
  table,
  tableHeader,
  tableCell,
} from './docsStyles';

export function AdvancedSection() {
  return (
    <section id="advanced" style={sectionContainer}>
      <h1 style={pageTitle}>Advanced Topics</h1>

      <h2 id="git-worktree-strategy" style={sectionTitle}>
        Git Worktree Strategy
      </h2>
      <p style={paragraph}>
        claudetree uses Git worktrees to isolate each session in its own directory with a separate
        working copy.
      </p>

      <h3 style={subSectionTitle}>Benefits</h3>
      <ul style={list}>
        <li>
          <strong>Isolation:</strong> Each session has independent file changes
        </li>
        <li>
          <strong>No conflicts:</strong> Multiple sessions can modify same files
        </li>
        <li>
          <strong>Fast switching:</strong> No need to stash/checkout
        </li>
        <li>
          <strong>Shared history:</strong> All worktrees share the same Git history
        </li>
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

      <h2 id="parallel-sessions" style={sectionTitle}>
        Parallel Sessions
      </h2>
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

      <h2 id="error-handling" style={sectionTitle}>
        Error Handling
      </h2>

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
  );
}

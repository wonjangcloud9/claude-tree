'use client';

import { CodeBlock } from './CodeBlock';
import {
  sectionContainer,
  pageTitle,
  sectionTitle,
  subSectionTitle,
  paragraph,
  list,
  inlineCode,
  table,
  tableHeader,
  tableCell,
} from './docsStyles';

export function ConfigurationSection() {
  return (
    <section id="configuration" style={sectionContainer}>
      <h1 style={pageTitle}>Configuration</h1>

      <h2 id="config-json" style={sectionTitle}>
        config.json
      </h2>
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
            <td style={tableCell}>
              <code style={inlineCode}>version</code>
            </td>
            <td style={tableCell}>string</td>
            <td style={tableCell}>"0.1.0"</td>
            <td style={tableCell}>Config schema version</td>
          </tr>
          <tr>
            <td style={tableCell}>
              <code style={inlineCode}>worktreeDir</code>
            </td>
            <td style={tableCell}>string</td>
            <td style={tableCell}>".worktrees"</td>
            <td style={tableCell}>Directory for Git worktrees</td>
          </tr>
          <tr>
            <td style={tableCell}>
              <code style={inlineCode}>github.owner</code>
            </td>
            <td style={tableCell}>string</td>
            <td style={tableCell}>-</td>
            <td style={tableCell}>GitHub organization/user</td>
          </tr>
          <tr>
            <td style={tableCell}>
              <code style={inlineCode}>github.repo</code>
            </td>
            <td style={tableCell}>string</td>
            <td style={tableCell}>-</td>
            <td style={tableCell}>GitHub repository name</td>
          </tr>
          <tr>
            <td style={tableCell}>
              <code style={inlineCode}>github.token</code>
            </td>
            <td style={tableCell}>string</td>
            <td style={tableCell}>-</td>
            <td style={tableCell}>GitHub personal access token</td>
          </tr>
          <tr>
            <td style={tableCell}>
              <code style={inlineCode}>slack.webhookUrl</code>
            </td>
            <td style={tableCell}>string</td>
            <td style={tableCell}>-</td>
            <td style={tableCell}>Slack incoming webhook URL</td>
          </tr>
        </tbody>
      </table>

      <h2 id="github-integration" style={sectionTitle}>
        GitHub Integration
      </h2>
      <p style={paragraph}>
        Configure GitHub to automatically fetch issue details when starting sessions.
      </p>

      <h3 style={subSectionTitle}>Personal Access Token</h3>
      <p style={paragraph}>
        Create a token at GitHub → Settings → Developer settings → Personal access tokens
      </p>
      <p style={paragraph}>Required scopes:</p>
      <ul style={list}>
        <li>
          <code style={inlineCode}>repo</code> - Full control of private repositories
        </li>
        <li>
          <code style={inlineCode}>read:org</code> - Read org membership (for org repos)
        </li>
      </ul>

      <h3 style={subSectionTitle}>Environment Variable</h3>
      <CodeBlock
        code={`# .env or shell profile
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx`}
        language="bash"
      />

      <h2 id="slack-notifications" style={sectionTitle}>
        Slack Notifications
      </h2>
      <p style={paragraph}>Receive notifications when sessions complete or fail.</p>

      <h3 style={subSectionTitle}>Setup Webhook</h3>
      <ol style={list}>
        <li>
          Go to <a href="https://api.slack.com/apps" target="_blank">Slack API</a>
        </li>
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
  );
}

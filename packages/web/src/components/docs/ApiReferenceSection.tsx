'use client';

import { CodeBlock } from './CodeBlock';
import {
  sectionContainer,
  pageTitle,
  sectionTitle,
  subSectionTitle,
  paragraph,
  inlineCode,
  table,
  tableHeader,
  tableCell,
} from './docsStyles';

export function ApiReferenceSection() {
  return (
    <section id="api-reference" style={sectionContainer}>
      <h1 style={pageTitle}>API Reference</h1>

      <h2 id="rest-endpoints" style={sectionTitle}>
        REST Endpoints
      </h2>

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
            <td style={tableCell}>
              <code style={inlineCode}>GET</code>
            </td>
            <td style={tableCell}>/api/sessions</td>
            <td style={tableCell}>List all sessions</td>
          </tr>
          <tr>
            <td style={tableCell}>
              <code style={inlineCode}>POST</code>
            </td>
            <td style={tableCell}>/api/sessions</td>
            <td style={tableCell}>Create new session</td>
          </tr>
          <tr>
            <td style={tableCell}>
              <code style={inlineCode}>GET</code>
            </td>
            <td style={tableCell}>/api/sessions/:id</td>
            <td style={tableCell}>Get session details</td>
          </tr>
          <tr>
            <td style={tableCell}>
              <code style={inlineCode}>DELETE</code>
            </td>
            <td style={tableCell}>/api/sessions/:id</td>
            <td style={tableCell}>Delete session</td>
          </tr>
          <tr>
            <td style={tableCell}>
              <code style={inlineCode}>GET</code>
            </td>
            <td style={tableCell}>/api/sessions/:id/events</td>
            <td style={tableCell}>Get session events</td>
          </tr>
          <tr>
            <td style={tableCell}>
              <code style={inlineCode}>GET</code>
            </td>
            <td style={tableCell}>/api/sessions/:id/approvals</td>
            <td style={tableCell}>Get tool approvals</td>
          </tr>
          <tr>
            <td style={tableCell}>
              <code style={inlineCode}>PATCH</code>
            </td>
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

      <h2 id="websocket-events" style={sectionTitle}>
        WebSocket Events
      </h2>
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

      <h2 id="typescript-types" style={sectionTitle}>
        TypeScript Types
      </h2>

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
  );
}

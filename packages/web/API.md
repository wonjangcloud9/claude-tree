# REST API Documentation

The web dashboard exposes REST API endpoints for session management.

**Base URL**: `http://localhost:3000/api`

---

## Sessions

### List All Sessions

```
GET /api/sessions
```

Returns all sessions, syncing with current git worktrees.

**Response**: `Session[]`

```json
[
  {
    "id": "uuid",
    "worktreeId": "/path/to/.worktrees/issue-42",
    "claudeSessionId": "session-id",
    "status": "running",
    "issueNumber": 42,
    "prompt": "Working on issue-42-fix-login",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "processId": "proc-id",
    "osProcessId": 12345,
    "lastHeartbeat": "2024-01-01T00:00:00.000Z",
    "errorCount": 0,
    "worktreePath": "/path/to/.worktrees/issue-42",
    "usage": {
      "inputTokens": 1000,
      "outputTokens": 500,
      "cacheReadInputTokens": 100,
      "cacheCreationInputTokens": 50,
      "totalCostUsd": 0.05
    },
    "progress": {
      "currentStep": "implementing",
      "completedSteps": ["analyzing"],
      "startedAt": "2024-01-01T00:00:00.000Z"
    }
  }
]
```

---

### Get Session by ID

```
GET /api/sessions/:id
```

**Parameters**:
- `id` (path): Session UUID

**Response**: `Session`

**Errors**:
- `404`: Session not found
- `500`: Failed to read session

---

### Delete Session

```
DELETE /api/sessions/:id
```

Deletes session and its associated git worktree/branch.

**Parameters**:
- `id` (path): Session UUID

**Response**:
```json
{ "success": true }
```

**Errors**:
- `403`: Cannot delete protected session (develop/main)
- `404`: Session not found
- `500`: Failed to delete session

**Side Effects**:
- Removes git worktree
- Deletes associated branch (except main/develop/master)
- Cleans up events, approvals, reviews files

---

## Events

### Get Session Events

```
GET /api/sessions/:id/events
```

**Parameters**:
- `id` (path): Session UUID
- `limit` (query, optional): Max events to return (default: 50)
- `offset` (query, optional): Skip first N events (default: 0)

**Response**:
```json
{
  "events": [
    {
      "id": "event-uuid",
      "sessionId": "session-uuid",
      "type": "output",
      "content": "Reading file src/index.ts",
      "metadata": {},
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 100,
  "hasMore": true
}
```

**Event Types**: `output` | `file_change` | `commit` | `test_run` | `tool_call` | `error` | `milestone`

---

## Approvals

### Get Session Approvals

```
GET /api/sessions/:id/approvals
```

Returns pending/resolved tool approvals for a session.

**Parameters**:
- `id` (path): Session UUID

**Response**: `ToolApproval[]`

```json
[
  {
    "id": "approval-uuid",
    "sessionId": "session-uuid",
    "toolName": "Write",
    "parameters": { "path": "src/index.ts" },
    "status": "pending",
    "approvedBy": null,
    "requestedAt": "2024-01-01T00:00:00.000Z",
    "resolvedAt": null
  }
]
```

---

### Update Approval Status

```
PATCH /api/sessions/:id/approvals/:approvalId
```

Approve or reject a tool approval request.

**Parameters**:
- `id` (path): Session UUID
- `approvalId` (path): Approval UUID

**Request Body**:
```json
{
  "status": "approved",
  "approvedBy": "user@example.com"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | `"approved"` \| `"rejected"` | Yes | New status |
| approvedBy | string | No | Approver identifier |

**Response**:
```json
{
  "success": true,
  "approval": { ... }
}
```

**Errors**:
- `404`: Approval not found
- `500`: Failed to update approval

---

## Reviews

### Get Session Review

```
GET /api/sessions/:id/review
```

Returns the code review for a session.

**Parameters**:
- `id` (path): Session UUID

**Response**: `CodeReview | null`

```json
{
  "id": "review-uuid",
  "sessionId": "session-uuid",
  "status": "pending",
  "comment": null,
  "changes": [
    {
      "path": "src/index.ts",
      "additions": 10,
      "deletions": 5,
      "status": "modified"
    }
  ],
  "requestedAt": "2024-01-01T00:00:00.000Z",
  "resolvedAt": null
}
```

---

### Update Review Status

```
PATCH /api/sessions/:id/review
```

Approve, reject, or request changes on a code review.

**Parameters**:
- `id` (path): Session UUID

**Request Body**:
```json
{
  "status": "approved",
  "comment": "Looks good!"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | `"approved"` \| `"rejected"` \| `"changes_requested"` | Yes | New status |
| comment | string | No | Review comment |

**Response**:
```json
{
  "success": true,
  "review": { ... }
}
```

**Errors**:
- `404`: Review not found
- `500`: Failed to update review

---

## Type Definitions

### Session

```typescript
interface Session {
  id: string;
  worktreeId: string;
  claudeSessionId: string | null;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  issueNumber: number | null;
  prompt: string | null;
  createdAt: Date;
  updatedAt: Date;
  processId: string | null;
  osProcessId: number | null;
  lastHeartbeat: Date | null;
  errorCount: number;
  worktreePath: string | null;
  usage: TokenUsage | null;
  progress: SessionProgress | null;
}
```

### TokenUsage

```typescript
interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  totalCostUsd: number;
}
```

### SessionProgress

```typescript
interface SessionProgress {
  currentStep: 'analyzing' | 'implementing' | 'testing' | 'committing' | 'creating_pr';
  completedSteps: ProgressStep[];
  startedAt: Date;
}
```

### SessionEvent

```typescript
interface SessionEvent {
  id: string;
  sessionId: string;
  type: 'output' | 'file_change' | 'commit' | 'test_run' | 'tool_call' | 'error' | 'milestone';
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}
```

### ToolApproval

```typescript
interface ToolApproval {
  id: string;
  sessionId: string;
  toolName: string;
  parameters: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy: string | null;
  requestedAt: string;
  resolvedAt: string | null;
}
```

### CodeReview

```typescript
interface CodeReview {
  id: string;
  sessionId: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  comment: string | null;
  changes: FileChange[];
  requestedAt: string;
  resolvedAt: string | null;
}

interface FileChange {
  path: string;
  additions: number;
  deletions: number;
  status: 'added' | 'modified' | 'deleted';
}
```

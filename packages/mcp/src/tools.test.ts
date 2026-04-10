import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindAll = vi.fn();
const mockSave = vi.fn();
const mockFindBySessionId = vi.fn();
const mockIsProcessAlive = vi.fn();

vi.mock('@claudetree/core', () => ({
  FileSessionRepository: vi.fn().mockImplementation(() => ({
    findAll: mockFindAll,
    save: mockSave,
  })),
  FileEventRepository: vi.fn().mockImplementation(() => ({
    findBySessionId: mockFindBySessionId,
  })),
  ClaudeSessionAdapter: vi.fn().mockImplementation(() => ({
    isProcessAlive: mockIsProcessAlive,
  })),
}));

vi.mock('node:child_process', () => ({
  spawn: vi.fn().mockReturnValue({ unref: vi.fn(), pid: 12345 }),
}));

// We test the tool handlers by extracting the registration
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from './tools.js';

// Capture registered tools
type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
}>;

function captureTools(): Map<string, ToolHandler> {
  const tools = new Map<string, ToolHandler>();

  const mockServer = {
    registerTool: (name: string, _schema: unknown, handler: ToolHandler) => {
      tools.set(name, handler);
    },
  } as unknown as McpServer;

  registerTools(mockServer);
  return tools;
}

describe('MCP Tools', () => {
  let tools: Map<string, ToolHandler>;

  beforeEach(() => {
    mockFindAll.mockReset();
    mockSave.mockReset();
    mockFindBySessionId.mockReset();
    mockIsProcessAlive.mockReset();
    tools = captureTools();
  });

  it('registers all expected tools', () => {
    expect(tools.has('ct_sessions_list')).toBe(true);
    expect(tools.has('ct_session_detail')).toBe(true);
    expect(tools.has('ct_session_logs')).toBe(true);
    expect(tools.has('ct_start')).toBe(true);
    expect(tools.has('ct_stop')).toBe(true);
    expect(tools.has('ct_stats')).toBe(true);
    expect(tools.has('ct_health')).toBe(true);
    expect(tools.has('ct_bustercall')).toBe(true);
    expect(tools.has('ct_pr')).toBe(true);
    expect(tools.has('ct_config')).toBe(true);
    expect(tools.has('ct_summary')).toBe(true);
    expect(tools.size).toBe(11);
  });

  describe('ct_sessions_list', () => {
    it('returns empty message when no sessions', async () => {
      mockFindAll.mockResolvedValue([]);
      const handler = tools.get('ct_sessions_list')!;
      const result = await handler({});
      expect(result.content[0]!.text).toContain('No sessions found');
    });

    it('lists sessions with details', async () => {
      mockFindAll.mockResolvedValue([
        {
          id: 'abc12345-full-id',
          status: 'running',
          issueNumber: 42,
          usage: { totalCostUsd: 0.05 },
          retryCount: 0,
        },
      ]);
      const handler = tools.get('ct_sessions_list')!;
      const result = await handler({});
      expect(result.content[0]!.text).toContain('abc12345');
      expect(result.content[0]!.text).toContain('#42');
      expect(result.content[0]!.text).toContain('running');
    });

    it('filters by status', async () => {
      mockFindAll.mockResolvedValue([
        { id: 'aaa', status: 'running', retryCount: 0 },
        { id: 'bbb', status: 'failed', retryCount: 0 },
      ]);
      const handler = tools.get('ct_sessions_list')!;
      const result = await handler({ status: 'failed' });
      expect(result.content[0]!.text).toContain('bbb');
      expect(result.content[0]!.text).not.toContain('aaa');
    });
  });

  describe('ct_session_detail', () => {
    it('returns not found for unknown session', async () => {
      mockFindAll.mockResolvedValue([]);
      const handler = tools.get('ct_session_detail')!;
      const result = await handler({ sessionId: 'xyz' });
      expect(result.content[0]!.text).toContain('not found');
    });

    it('returns session details', async () => {
      mockFindAll.mockResolvedValue([
        {
          id: 'abc12345-full',
          status: 'completed',
          issueNumber: 10,
          worktreePath: '/tmp/wt',
          worktreeId: 'wt-1',
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
          usage: { inputTokens: 1000, outputTokens: 500, totalCostUsd: 0.03 },
          progress: null,
          retryCount: 0,
          lastError: null,
          tags: [],
          osProcessId: null,
        },
      ]);
      const handler = tools.get('ct_session_detail')!;
      const result = await handler({ sessionId: 'abc12345' });
      expect(result.content[0]!.text).toContain('completed');
      expect(result.content[0]!.text).toContain('1000');
    });
  });

  describe('ct_stats', () => {
    it('returns no data message when empty', async () => {
      mockFindAll.mockResolvedValue([]);
      const handler = tools.get('ct_stats')!;
      const result = await handler({});
      expect(result.content[0]!.text).toContain('No sessions with usage');
    });

    it('calculates aggregated stats', async () => {
      mockFindAll.mockResolvedValue([
        { status: 'completed', usage: { inputTokens: 1000, outputTokens: 500, totalCostUsd: 0.02 } },
        { status: 'failed', usage: { inputTokens: 2000, outputTokens: 800, totalCostUsd: 0.04 } },
      ]);
      const handler = tools.get('ct_stats')!;
      const result = await handler({});
      expect(result.content[0]!.text).toContain('$0.0600');
      expect(result.content[0]!.text).toContain('3,000');
    });
  });

  describe('ct_health', () => {
    it('returns no running sessions message', async () => {
      mockFindAll.mockResolvedValue([]);
      const handler = tools.get('ct_health')!;
      const result = await handler({});
      expect(result.content[0]!.text).toContain('No running sessions');
    });

    it('detects zombie sessions', async () => {
      mockFindAll.mockResolvedValue([
        { id: 'dead-session-id', status: 'running', osProcessId: 99999 },
      ]);
      mockIsProcessAlive.mockReturnValue(false);
      const handler = tools.get('ct_health')!;
      const result = await handler({});
      expect(result.content[0]!.text).toContain('ZOMBIE');
    });

    it('fixes zombie sessions when fix=true', async () => {
      const session = {
        id: 'dead-session-id',
        status: 'running',
        osProcessId: 99999,
        updatedAt: new Date(),
      };
      mockFindAll.mockResolvedValue([session]);
      mockIsProcessAlive.mockReturnValue(false);
      const handler = tools.get('ct_health')!;
      const result = await handler({ fix: true });
      expect(result.content[0]!.text).toContain('fixed');
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('ct_stop', () => {
    it('returns not found for unknown session', async () => {
      mockFindAll.mockResolvedValue([]);
      const handler = tools.get('ct_stop')!;
      const result = await handler({ sessionId: 'xyz' });
      expect(result.content[0]!.text).toContain('not found');
    });

    it('rejects stopping non-running session', async () => {
      mockFindAll.mockResolvedValue([
        { id: 'abc', status: 'completed' },
      ]);
      const handler = tools.get('ct_stop')!;
      const result = await handler({ sessionId: 'abc' });
      expect(result.content[0]!.text).toContain('not running');
    });
  });
});

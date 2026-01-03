import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClaudeSessionAdapter } from './ClaudeSessionAdapter.js';

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

describe('ClaudeSessionAdapter', () => {
  let adapter: ClaudeSessionAdapter;

  beforeEach(() => {
    adapter = new ClaudeSessionAdapter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('buildArgs', () => {
    it('should build basic args with prompt', () => {
      const args = adapter.buildArgs({
        workingDir: '/tmp/test',
        prompt: 'Hello',
      });

      expect(args).toContain('-p');
      expect(args).toContain('Hello');
      expect(args).toContain('--output-format');
      expect(args).toContain('stream-json');
    });

    it('should include allowed tools when provided', () => {
      const args = adapter.buildArgs({
        workingDir: '/tmp/test',
        prompt: 'Hello',
        allowedTools: ['Read', 'Write', 'Bash'],
      });

      expect(args).toContain('--allowedTools');
      expect(args).toContain('Read,Write,Bash');
    });

    it('should include system prompt when provided', () => {
      const args = adapter.buildArgs({
        workingDir: '/tmp/test',
        prompt: 'Hello',
        systemPrompt: 'You are a helpful assistant',
      });

      expect(args).toContain('--append-system-prompt');
      expect(args).toContain('You are a helpful assistant');
    });

    it('should include resume flag when provided', () => {
      const args = adapter.buildArgs({
        workingDir: '/tmp/test',
        prompt: 'Continue',
        resume: 'session-123',
      });

      expect(args).toContain('--resume');
      expect(args).toContain('session-123');
    });
  });

  describe('parseStreamOutput', () => {
    it('should parse assistant message', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Hello!' }] },
      });

      const result = adapter.parseStreamOutput(line);

      expect(result).toEqual({
        type: 'text',
        content: 'Hello!',
        timestamp: expect.any(Date),
      });
    });

    it('should parse tool use', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', name: 'Read', input: { path: '/tmp' } }],
        },
      });

      const result = adapter.parseStreamOutput(line);

      expect(result).toEqual({
        type: 'tool_use',
        content: expect.stringContaining('Read'),
        timestamp: expect.any(Date),
      });
    });

    it('should parse result message with session id', () => {
      const line = JSON.stringify({
        type: 'result',
        session_id: 'abc-123',
      });

      const result = adapter.parseStreamOutput(line);

      expect(result).toEqual({
        type: 'done',
        content: 'abc-123',
        timestamp: expect.any(Date),
      });
    });

    it('should handle invalid JSON gracefully', () => {
      const result = adapter.parseStreamOutput('not json');

      expect(result).toEqual({
        type: 'text',
        content: 'not json',
        timestamp: expect.any(Date),
      });
    });
  });

  describe('isClaudeAvailable', () => {
    it('should return true when claude is installed', async () => {
      const { execa } = await import('execa');
      vi.mocked(execa).mockResolvedValueOnce({
        stdout: '/usr/local/bin/claude',
        stderr: '',
        exitCode: 0,
      } as never);

      const result = await adapter.isClaudeAvailable();

      expect(result).toBe(true);
    });

    it('should return false when claude is not installed', async () => {
      const { execa } = await import('execa');
      vi.mocked(execa).mockRejectedValueOnce(new Error('not found'));

      const result = await adapter.isClaudeAvailable();

      expect(result).toBe(false);
    });
  });
});

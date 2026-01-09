import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateAIReviewSummary, type GenerateReviewOptions } from './AIReviewGenerator.js';
import * as childProcess from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';

// Mock child_process.spawn
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

describe('AIReviewGenerator', () => {
  let spawnMock: ReturnType<typeof vi.fn>;

  const createMockProcess = (
    stdout: string,
    stderr: string,
    exitCode: number,
    options?: { shouldError?: boolean; errorMessage?: string }
  ): ChildProcess => {
    const proc = new EventEmitter() as ChildProcess & { stdout: EventEmitter; stderr: EventEmitter };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = vi.fn();

    // Schedule data and close events
    setTimeout(() => {
      if (options?.shouldError) {
        proc.emit('error', new Error(options.errorMessage || 'Process error'));
      } else {
        proc.stdout.emit('data', Buffer.from(stdout));
        proc.stderr.emit('data', Buffer.from(stderr));
        proc.emit('close', exitCode);
      }
    }, 0);

    return proc;
  };

  beforeEach(() => {
    spawnMock = vi.mocked(childProcess.spawn);
    spawnMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('generateAIReviewSummary', () => {
    const baseOptions: GenerateReviewOptions = {
      sessionId: 'test-session-123',
      workingDir: '/test/project',
      baseBranch: 'main',
    };

    it('should return null when there are no changes', async () => {
      // First call: git diff --stat returns empty
      spawnMock.mockImplementationOnce(() =>
        createMockProcess('', '', 0)
      );
      // Second call: git diff (detailed) - should not be reached if first is empty
      spawnMock.mockImplementationOnce(() =>
        createMockProcess('', '', 0)
      );

      const result = await generateAIReviewSummary(baseOptions);

      expect(result).toBeNull();
    });

    it('should generate review summary successfully', async () => {
      const diffStat = ' src/test.ts | 10 +++++-----\n 1 file changed';
      const detailedDiff = 'diff --git a/src/test.ts\n+added line\n-removed line';
      const claudeResponse = JSON.stringify({
        summary: 'Added new feature',
        whatChanged: ['Added test file'],
        whyChanged: 'To improve coverage',
        potentialIssues: [],
        suggestions: ['Add more tests'],
        riskLevel: 'low',
      });

      // git diff --stat
      spawnMock.mockImplementationOnce(() =>
        createMockProcess(diffStat, '', 0)
      );
      // git diff (detailed)
      spawnMock.mockImplementationOnce(() =>
        createMockProcess(detailedDiff, '', 0)
      );
      // claude CLI
      spawnMock.mockImplementationOnce(() =>
        createMockProcess(claudeResponse, '', 0)
      );

      const result = await generateAIReviewSummary(baseOptions);

      expect(result).not.toBeNull();
      expect(result?.sessionId).toBe('test-session-123');
      expect(result?.summary).toBe('Added new feature');
      expect(result?.whatChanged).toContain('Added test file');
      expect(result?.whyChanged).toBe('To improve coverage');
      expect(result?.suggestions).toContain('Add more tests');
      expect(result?.riskLevel).toBe('low');
      expect(result?.generatedAt).toBeInstanceOf(Date);
    });

    it('should use develop as default base branch', async () => {
      const optionsWithoutBranch: GenerateReviewOptions = {
        sessionId: 'test-session',
        workingDir: '/test',
      };

      spawnMock.mockImplementation((cmd, args) => {
        if (cmd === 'git' && args.includes('diff')) {
          // Check that develop is used
          expect(args).toContain('develop');
        }
        return createMockProcess('', '', 0);
      });

      await generateAIReviewSummary(optionsWithoutBranch);

      expect(spawnMock).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['develop']),
        expect.any(Object)
      );
    });

    it('should handle git command failure', async () => {
      spawnMock.mockImplementationOnce(() =>
        createMockProcess('', 'fatal: not a git repository', 1)
      );

      const result = await generateAIReviewSummary(baseOptions);

      expect(result).toBeNull();
    });

    it('should handle claude CLI failure', async () => {
      // git diff --stat
      spawnMock.mockImplementationOnce(() =>
        createMockProcess('file.ts | 5 +++++', '', 0)
      );
      // git diff detailed
      spawnMock.mockImplementationOnce(() =>
        createMockProcess('+line', '', 0)
      );
      // claude CLI fails
      spawnMock.mockImplementationOnce(() =>
        createMockProcess('', 'API error', 1)
      );

      const result = await generateAIReviewSummary(baseOptions);

      expect(result).toBeNull();
    });

    it('should handle invalid JSON response from Claude', async () => {
      // git diff --stat
      spawnMock.mockImplementationOnce(() =>
        createMockProcess('file.ts | 5 +++++', '', 0)
      );
      // git diff detailed
      spawnMock.mockImplementationOnce(() =>
        createMockProcess('+line', '', 0)
      );
      // claude returns invalid JSON
      spawnMock.mockImplementationOnce(() =>
        createMockProcess('This is not JSON', '', 0)
      );

      const result = await generateAIReviewSummary(baseOptions);

      expect(result).toBeNull();
    });

    it('should extract JSON from Claude response with extra text', async () => {
      // git diff --stat
      spawnMock.mockImplementationOnce(() =>
        createMockProcess('file.ts | 5 +++++', '', 0)
      );
      // git diff detailed
      spawnMock.mockImplementationOnce(() =>
        createMockProcess('+line', '', 0)
      );
      // claude returns JSON with surrounding text
      const responseWithExtra = `Here's my analysis:
${JSON.stringify({
  summary: 'Test summary',
  whatChanged: ['change 1'],
  whyChanged: 'reason',
  potentialIssues: [],
  suggestions: [],
  riskLevel: 'low',
})}
Let me know if you need more details.`;

      spawnMock.mockImplementationOnce(() =>
        createMockProcess(responseWithExtra, '', 0)
      );

      const result = await generateAIReviewSummary(baseOptions);

      expect(result).not.toBeNull();
      expect(result?.summary).toBe('Test summary');
    });

    it('should handle missing fields in Claude response with defaults', async () => {
      // git diff --stat
      spawnMock.mockImplementationOnce(() =>
        createMockProcess('file.ts | 5 +++++', '', 0)
      );
      // git diff detailed
      spawnMock.mockImplementationOnce(() =>
        createMockProcess('+line', '', 0)
      );
      // claude returns partial JSON
      spawnMock.mockImplementationOnce(() =>
        createMockProcess('{}', '', 0)
      );

      const result = await generateAIReviewSummary(baseOptions);

      expect(result).not.toBeNull();
      expect(result?.summary).toBe('No summary available');
      expect(result?.whatChanged).toEqual([]);
      expect(result?.whyChanged).toBe('Unknown');
      expect(result?.potentialIssues).toEqual([]);
      expect(result?.suggestions).toEqual([]);
      expect(result?.riskLevel).toBe('low');
    });

    it('should parse potential issues correctly', async () => {
      // git diff --stat
      spawnMock.mockImplementationOnce(() =>
        createMockProcess('file.ts | 5 +++++', '', 0)
      );
      // git diff detailed
      spawnMock.mockImplementationOnce(() =>
        createMockProcess('+line', '', 0)
      );
      // claude returns response with issues
      const responseWithIssues = JSON.stringify({
        summary: 'Test',
        whatChanged: [],
        whyChanged: 'test',
        potentialIssues: [
          {
            severity: 'warning',
            title: 'Security issue',
            description: 'Potential XSS vulnerability',
            file: 'src/component.tsx',
            line: 42,
          },
          {
            severity: 'info',
            title: 'Style suggestion',
            description: 'Consider using const',
          },
        ],
        suggestions: [],
        riskLevel: 'medium',
      });

      spawnMock.mockImplementationOnce(() =>
        createMockProcess(responseWithIssues, '', 0)
      );

      const result = await generateAIReviewSummary(baseOptions);

      expect(result?.potentialIssues).toHaveLength(2);
      expect(result?.potentialIssues[0]).toEqual({
        severity: 'warning',
        title: 'Security issue',
        description: 'Potential XSS vulnerability',
        file: 'src/component.tsx',
        line: 42,
      });
      expect(result?.potentialIssues[1]?.file).toBeUndefined();
    });

    it('should handle process spawn error', async () => {
      spawnMock.mockImplementationOnce(() =>
        createMockProcess('', '', 0, { shouldError: true, errorMessage: 'spawn failed' })
      );

      const result = await generateAIReviewSummary(baseOptions);

      expect(result).toBeNull();
    });

    it('should truncate very long diffs in prompt', async () => {
      const longDiff = 'A'.repeat(20000); // Longer than maxDiffLength (15000)

      // git diff --stat
      spawnMock.mockImplementationOnce(() =>
        createMockProcess('file.ts | 5 +++++', '', 0)
      );
      // git diff detailed - very long
      spawnMock.mockImplementationOnce(() =>
        createMockProcess(longDiff, '', 0)
      );
      // claude CLI
      spawnMock.mockImplementationOnce((cmd, args) => {
        // Verify the prompt contains truncation marker
        if (cmd === 'claude') {
          const prompt = args[1]; // -p <prompt>
          expect(prompt).toContain('... (truncated)');
        }
        return createMockProcess(JSON.stringify({
          summary: 'test',
          whatChanged: [],
          whyChanged: 'test',
          potentialIssues: [],
          suggestions: [],
          riskLevel: 'low',
        }), '', 0);
      });

      await generateAIReviewSummary(baseOptions);

      // The test passes if no errors and the mock verifications pass
      expect(spawnMock).toHaveBeenCalledTimes(3);
    });
  });
});

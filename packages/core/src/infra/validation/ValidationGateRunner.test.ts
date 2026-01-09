import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ValidationGateRunner,
  DEFAULT_GATES,
  detectProjectGates,
  type GateRunOptions,
} from './ValidationGateRunner.js';
import type { ValidationGate } from '@claudetree/shared';
import * as childProcess from 'node:child_process';
import { promisify } from 'node:util';

vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('../logger/index.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('ValidationGateRunner', () => {
  let runner: ValidationGateRunner;
  let execMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    runner = new ValidationGateRunner();
    execMock = vi.mocked(childProcess.exec);
    execMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('runGate', () => {
    const gate: ValidationGate = {
      name: 'test',
      command: 'npm test',
      required: true,
    };

    const options: GateRunOptions = {
      cwd: '/test/project',
      maxRetries: 3,
      timeout: 10000,
    };

    it('should run gate successfully on first attempt', async () => {
      execMock.mockImplementation((_cmd, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(null, { stdout: 'All tests passed', stderr: '' });
        }
        return { on: vi.fn(), stdout: null, stderr: null };
      });

      const result = await runner.runGate(gate, options);

      expect(result.gateName).toBe('test');
      expect(result.passed).toBe(true);
      expect(result.attempts).toBe(1);
      expect(result.output).toContain('All tests passed');
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('should retry on failure and eventually pass', async () => {
      let callCount = 0;
      execMock.mockImplementation((_cmd, _opts, callback) => {
        callCount++;
        if (typeof callback === 'function') {
          if (callCount < 2) {
            callback(new Error('Test failed'), { stdout: '', stderr: 'Error' });
          } else {
            callback(null, { stdout: 'Tests passed', stderr: '' });
          }
        }
        return { on: vi.fn(), stdout: null, stderr: null };
      });

      const result = await runner.runGate(gate, options);

      expect(result.passed).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it('should fail after max retries exceeded', async () => {
      execMock.mockImplementation((_cmd, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('Test failed'), { stdout: '', stderr: 'Error output' });
        }
        return { on: vi.fn(), stdout: null, stderr: null };
      });

      const result = await runner.runGate(gate, options);

      expect(result.passed).toBe(false);
      expect(result.attempts).toBe(3);
    });

    it('should truncate long output', async () => {
      const longOutput = 'A'.repeat(2000);
      execMock.mockImplementation((_cmd, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(null, { stdout: longOutput, stderr: '' });
        }
        return { on: vi.fn(), stdout: null, stderr: null };
      });

      const result = await runner.runGate(gate, options);

      expect(result.output.length).toBeLessThan(longOutput.length);
      expect(result.output).toContain('... (truncated)');
    });

    it('should use default timeout when not specified', async () => {
      execMock.mockImplementation((cmd, opts, callback) => {
        // Check that timeout is set
        expect((opts as { timeout?: number }).timeout).toBe(5 * 60 * 1000);
        if (typeof callback === 'function') {
          callback(null, { stdout: 'OK', stderr: '' });
        }
        return { on: vi.fn(), stdout: null, stderr: null };
      });

      const optionsWithoutTimeout: GateRunOptions = {
        cwd: '/test',
        maxRetries: 1,
      };

      await runner.runGate(gate, optionsWithoutTimeout);
    });
  });

  describe('runAll', () => {
    const gates: ValidationGate[] = [
      { name: 'install', command: 'npm ci', required: true },
      { name: 'test', command: 'npm test', required: true },
      { name: 'lint', command: 'npm run lint', required: false },
    ];

    const options: GateRunOptions = {
      cwd: '/test',
      maxRetries: 1,
    };

    it('should run all gates in sequence', async () => {
      const executionOrder: string[] = [];
      execMock.mockImplementation((cmd, _opts, callback) => {
        executionOrder.push(cmd as string);
        if (typeof callback === 'function') {
          callback(null, { stdout: 'OK', stderr: '' });
        }
        return { on: vi.fn(), stdout: null, stderr: null };
      });

      const result = await runner.runAll(gates, options);

      expect(result.results).toHaveLength(3);
      expect(result.allPassed).toBe(true);
      expect(result.totalTime).toBeGreaterThanOrEqual(0);
      expect(executionOrder).toEqual(['npm ci', 'npm test', 'npm run lint']);
    });

    it('should stop on required gate failure', async () => {
      execMock.mockImplementation((cmd, _opts, callback) => {
        if (typeof callback === 'function') {
          if (cmd === 'npm test') {
            callback(new Error('Failed'), { stdout: '', stderr: 'Error' });
          } else {
            callback(null, { stdout: 'OK', stderr: '' });
          }
        }
        return { on: vi.fn(), stdout: null, stderr: null };
      });

      const result = await runner.runAll(gates, options);

      expect(result.allPassed).toBe(false);
      expect(result.results).toHaveLength(2); // Stops after failed required gate
      expect(result.results[1]?.passed).toBe(false);
    });

    it('should continue on optional gate failure', async () => {
      const gatesWithOptional: ValidationGate[] = [
        { name: 'test', command: 'npm test', required: true },
        { name: 'lint', command: 'npm run lint', required: false },
        { name: 'build', command: 'npm run build', required: true },
      ];

      execMock.mockImplementation((cmd, _opts, callback) => {
        if (typeof callback === 'function') {
          if (cmd === 'npm run lint') {
            callback(new Error('Lint failed'), { stdout: '', stderr: '' });
          } else {
            callback(null, { stdout: 'OK', stderr: '' });
          }
        }
        return { on: vi.fn(), stdout: null, stderr: null };
      });

      const result = await runner.runAll(gatesWithOptional, options);

      expect(result.allPassed).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.results[1]?.passed).toBe(false);
      expect(result.results[2]?.passed).toBe(true);
    });
  });

  describe('runWithAutoRetry', () => {
    const gates: ValidationGate[] = [
      { name: 'test', command: 'npm test', required: true },
    ];

    it('should retry full validation on failure', async () => {
      let overallCalls = 0;
      execMock.mockImplementation((_cmd, _opts, callback) => {
        overallCalls++;
        if (typeof callback === 'function') {
          if (overallCalls < 2) {
            callback(new Error('Failed'), { stdout: '', stderr: '' });
          } else {
            callback(null, { stdout: 'OK', stderr: '' });
          }
        }
        return { on: vi.fn(), stdout: null, stderr: null };
      });

      const options: GateRunOptions = {
        cwd: '/test',
        maxRetries: 3,
      };

      const result = await runner.runWithAutoRetry(gates, options);

      expect(result.allPassed).toBe(true);
    });

    it('should call onRetry callback on failure', async () => {
      // runWithAutoRetry calls runAll, which calls runGate
      // runGate itself retries maxRetries times before failing
      // Then runWithAutoRetry retries the whole runAll
      // So we need to fail enough times to:
      // 1. Fail runGate's retries (maxRetries times)
      // 2. Then onRetry is called
      // 3. Then succeed on next overall attempt
      let callCount = 0;
      execMock.mockImplementation((_cmd, _opts, callback) => {
        callCount++;
        if (typeof callback === 'function') {
          // With maxRetries=2:
          // - runGate tries 2 times (calls 1-2), fails
          // - onRetry(1, 'test') is called
          // - runGate tries 2 times (calls 3-4), succeeds on 3rd
          if (callCount <= 2) {
            callback(new Error('Failed'), { stdout: '', stderr: '' });
          } else {
            callback(null, { stdout: 'OK', stderr: '' });
          }
        }
        return { on: vi.fn(), stdout: null, stderr: null };
      });

      const onRetry = vi.fn();
      const options: GateRunOptions & { onRetry?: (attempt: number, failedGate: string) => void } = {
        cwd: '/test',
        maxRetries: 2,
        onRetry,
      };

      const result = await runner.runWithAutoRetry(gates, options);

      expect(onRetry).toHaveBeenCalledWith(1, 'test');
      expect(result.allPassed).toBe(true);
    });

    it('should fail after overall max retries', async () => {
      execMock.mockImplementation((_cmd, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('Always fail'), { stdout: '', stderr: '' });
        }
        return { on: vi.fn(), stdout: null, stderr: null };
      });

      const options: GateRunOptions = {
        cwd: '/test',
        maxRetries: 2,
      };

      const result = await runner.runWithAutoRetry(gates, options);

      expect(result.allPassed).toBe(false);
    });
  });

  describe('DEFAULT_GATES', () => {
    it('should have node gates defined', () => {
      expect(DEFAULT_GATES.node).toBeDefined();
      expect(DEFAULT_GATES.node).toHaveLength(4);
      expect(DEFAULT_GATES.node[0]?.name).toBe('install');
      expect(DEFAULT_GATES.node[1]?.name).toBe('test');
      expect(DEFAULT_GATES.node[2]?.name).toBe('type');
      expect(DEFAULT_GATES.node[3]?.name).toBe('lint');
    });

    it('should have pnpm gates defined', () => {
      expect(DEFAULT_GATES.pnpm).toBeDefined();
      expect(DEFAULT_GATES.pnpm).toHaveLength(4);
      expect(DEFAULT_GATES.pnpm[0]?.command).toContain('pnpm install');
    });

    it('should have python gates defined', () => {
      expect(DEFAULT_GATES.python).toBeDefined();
      expect(DEFAULT_GATES.python[0]?.name).toBe('test');
      expect(DEFAULT_GATES.python[0]?.command).toBe('pytest');
    });

    it('should mark required gates correctly', () => {
      expect(DEFAULT_GATES.node[0]?.required).toBe(true);
      expect(DEFAULT_GATES.node[3]?.required).toBe(false);
    });
  });

  describe('detectProjectGates', () => {
    it('should return pnpm gates by default', () => {
      const gates = detectProjectGates('/some/path');

      expect(gates).toEqual(DEFAULT_GATES.pnpm);
    });
  });
});

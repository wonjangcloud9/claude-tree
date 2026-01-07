import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { ValidationGate, GateResult } from '@claudetree/shared';
import { createLogger } from '../logger/index.js';

const execAsync = promisify(exec);
const logger = createLogger('validation');

const MAX_OUTPUT_LENGTH = 1000;

export interface GateRunOptions {
  /** Working directory to run the command in */
  cwd: string;
  /** Maximum retries for this gate */
  maxRetries: number;
  /** Timeout per gate execution in ms */
  timeout?: number;
}

export interface ValidationRunResult {
  /** All gate results */
  results: GateResult[];
  /** Whether all required gates passed */
  allPassed: boolean;
  /** Total execution time in ms */
  totalTime: number;
}

/**
 * Runs validation gates with retry support
 */
export class ValidationGateRunner {
  private defaultTimeout = 5 * 60 * 1000; // 5 minutes per gate

  /**
   * Run a single gate with retries
   */
  async runGate(
    gate: ValidationGate,
    options: GateRunOptions
  ): Promise<GateResult> {
    let attempts = 0;
    let lastOutput = '';
    let passed = false;

    while (attempts < options.maxRetries && !passed) {
      attempts++;
      logger.info('Running gate %s (attempt %d/%d)', gate.name, attempts, options.maxRetries);

      try {
        const { stdout, stderr } = await execAsync(gate.command, {
          cwd: options.cwd,
          timeout: options.timeout ?? this.defaultTimeout,
          maxBuffer: 10 * 1024 * 1024, // 10MB
        });

        lastOutput = this.truncateOutput(stdout + stderr);
        passed = true;
        logger.info('Gate %s passed', gate.name);
      } catch (error) {
        const execError = error as { stdout?: string; stderr?: string; message?: string };
        lastOutput = this.truncateOutput(
          (execError.stdout ?? '') + (execError.stderr ?? '') || execError.message || 'Unknown error'
        );
        logger.error('Gate %s failed: %s', gate.name, lastOutput.slice(0, 200));

        if (attempts < options.maxRetries) {
          logger.info('Retrying gate %s...', gate.name);
        }
      }
    }

    return {
      gateName: gate.name,
      passed,
      attempts,
      output: lastOutput,
      completedAt: new Date(),
    };
  }

  /**
   * Run all gates in sequence
   */
  async runAll(
    gates: ValidationGate[],
    options: GateRunOptions
  ): Promise<ValidationRunResult> {
    const startTime = Date.now();
    const results: GateResult[] = [];
    let allPassed = true;

    for (const gate of gates) {
      const result = await this.runGate(gate, options);
      results.push(result);

      if (!result.passed && gate.required) {
        allPassed = false;
        logger.error('Required gate %s failed, stopping validation', gate.name);
        break;
      }
    }

    return {
      results,
      allPassed,
      totalTime: Date.now() - startTime,
    };
  }

  /**
   * Run gates with auto-retry on failure
   * Returns when all gates pass or max retries exceeded
   */
  async runWithAutoRetry(
    gates: ValidationGate[],
    options: GateRunOptions & { onRetry?: (attempt: number, failedGate: string) => void }
  ): Promise<ValidationRunResult> {
    let overallAttempts = 0;
    let result: ValidationRunResult;

    do {
      overallAttempts++;
      result = await this.runAll(gates, options);

      if (!result.allPassed && overallAttempts < options.maxRetries) {
        const failedGate = result.results.find(r => !r.passed)?.gateName ?? 'unknown';
        options.onRetry?.(overallAttempts, failedGate);
        logger.info('Validation failed, retrying (attempt %d/%d)', overallAttempts + 1, options.maxRetries);
      }
    } while (!result.allPassed && overallAttempts < options.maxRetries);

    return result;
  }

  private truncateOutput(output: string): string {
    if (output.length <= MAX_OUTPUT_LENGTH) {
      return output;
    }
    return output.slice(0, MAX_OUTPUT_LENGTH) + '\n... (truncated)';
  }
}

/**
 * Default validation gates for different project types
 */
export const DEFAULT_GATES = {
  node: [
    { name: 'test', command: 'npm test', required: true },
    { name: 'type', command: 'npx tsc --noEmit', required: true },
    { name: 'lint', command: 'npm run lint', required: false },
  ],
  pnpm: [
    { name: 'test', command: 'pnpm test', required: true },
    { name: 'type', command: 'pnpm tsc --noEmit', required: true },
    { name: 'lint', command: 'pnpm lint', required: false },
  ],
  python: [
    { name: 'test', command: 'pytest', required: true },
    { name: 'type', command: 'mypy .', required: false },
    { name: 'lint', command: 'ruff check .', required: false },
  ],
};

/**
 * Detect project type and return appropriate gates
 */
export function detectProjectGates(_cwd: string): ValidationGate[] {
  // For now, default to pnpm (can be enhanced to detect package manager)
  return DEFAULT_GATES.pnpm;
}

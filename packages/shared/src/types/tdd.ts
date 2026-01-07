/**
 * TDD Session Configuration
 */
export interface TDDConfig {
  /** Total session timeout in milliseconds */
  timeout: number;
  /** Idle timeout (no output) in milliseconds */
  idleTimeout: number;
  /** Maximum TDD iterations (test-implement cycles) */
  maxIterations: number;
  /** Maximum retries per validation gate */
  maxRetries: number;
  /** Validation gates to run */
  gates: ValidationGate[];
}

/**
 * Validation Gate Configuration
 */
export interface ValidationGate {
  /** Gate name (e.g., 'test', 'type', 'lint') */
  name: string;
  /** Command to execute */
  command: string;
  /** Whether this gate is required to pass */
  required: boolean;
}

/**
 * Result of running a validation gate
 */
export interface GateResult {
  /** Gate name */
  gateName: string;
  /** Whether the gate passed */
  passed: boolean;
  /** Number of attempts made */
  attempts: number;
  /** Command output (truncated) */
  output?: string;
  /** When the gate completed */
  completedAt: Date;
}

/**
 * TDD Phase
 */
export type TDDPhase =
  | 'initializing'     // Setting up
  | 'writing_test'     // Writing failing test
  | 'running_test_red' // Running test (expecting fail)
  | 'implementing'     // Writing implementation
  | 'running_test_green' // Running test (expecting pass)
  | 'validating'       // Running validation gates
  | 'completed'        // All done
  | 'failed';          // Failed after retries

/**
 * TDD Session State (extends Session)
 */
export interface TDDSessionState {
  /** Current TDD phase */
  phase: TDDPhase;
  /** Current iteration number (1-based) */
  currentIteration: number;
  /** Gate results for current iteration */
  gateResults: GateResult[];
  /** Number of consecutive failures */
  failureCount: number;
  /** Last activity timestamp */
  lastActivity: Date;
  /** TDD configuration */
  config: TDDConfig;
}

/**
 * Default TDD configuration
 */
export const DEFAULT_TDD_CONFIG: TDDConfig = {
  timeout: 2 * 60 * 60 * 1000,     // 2 hours
  idleTimeout: 10 * 60 * 1000,     // 10 minutes
  maxIterations: 10,
  maxRetries: 3,
  gates: [
    { name: 'test', command: 'pnpm test', required: true },
    { name: 'type', command: 'pnpm tsc --noEmit', required: true },
    { name: 'lint', command: 'pnpm lint', required: false },
  ],
};

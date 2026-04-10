import type { ISessionRepository } from '../domain/repositories/ISessionRepository.js';

export interface ConcurrencyCheckResult {
  allowed: boolean;
  running: number;
  limit: number;
}

export class ConcurrencyGuard {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly maxSessions: number,
  ) {}

  async check(): Promise<ConcurrencyCheckResult> {
    const sessions = await this.sessionRepo.findAll();
    const running = sessions.filter(
      (s) => s.status === 'running' || s.status === 'pending',
    ).length;

    return {
      allowed: running < this.maxSessions,
      running,
      limit: this.maxSessions,
    };
  }

  async waitForSlot(pollIntervalMs: number = 5000, timeoutMs: number = 300_000): Promise<boolean> {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const result = await this.check();
      if (result.allowed) return true;
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    return false;
  }
}

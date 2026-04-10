import type { Session, RetryConfig } from '@claudetree/shared';
import type { ISessionRepository } from '../domain/repositories/ISessionRepository.js';
import type { IEventRepository } from '../domain/repositories/IEventRepository.js';
import { randomUUID } from 'node:crypto';

export interface RetryContext {
  session: Session;
  sessionRepo: ISessionRepository;
  eventRepo: IEventRepository;
  retryConfig: RetryConfig;
}

export interface RetryableOperation {
  (): Promise<{ success: boolean; error?: string }>;
}

export class SessionRetryManager {
  constructor(private readonly config: RetryConfig) {}

  shouldRetry(session: Session): boolean {
    return session.retryCount < this.config.maxRetries;
  }

  getDelay(retryCount: number): number {
    const delay =
      this.config.baseDelayMs *
      Math.pow(this.config.backoffMultiplier, retryCount);
    return Math.min(delay, this.config.maxDelayMs);
  }

  async executeWithRetry(
    operation: RetryableOperation,
    context: RetryContext,
  ): Promise<{ success: boolean; totalAttempts: number }> {
    const { session, sessionRepo, eventRepo } = context;
    let attempt = 0;

    while (attempt <= this.config.maxRetries) {
      const result = await operation();

      if (result.success) {
        return { success: true, totalAttempts: attempt + 1 };
      }

      session.errorCount++;
      session.retryCount = attempt + 1;
      session.lastError = result.error ?? 'Unknown error';
      session.updatedAt = new Date();
      await sessionRepo.save(session);

      await eventRepo.append({
        id: randomUUID(),
        sessionId: session.id,
        type: 'error',
        content: `Session failed (attempt ${attempt + 1}/${this.config.maxRetries + 1}): ${result.error ?? 'Unknown error'}`,
        timestamp: new Date(),
      });

      if (attempt >= this.config.maxRetries) {
        break;
      }

      const delay = this.getDelay(attempt);

      await eventRepo.append({
        id: randomUUID(),
        sessionId: session.id,
        type: 'output',
        content: `Retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 2}/${this.config.maxRetries + 1})...`,
        timestamp: new Date(),
      });

      await this.sleep(delay);
      attempt++;
    }

    session.status = 'failed';
    session.updatedAt = new Date();
    await sessionRepo.save(session);

    return { success: false, totalAttempts: attempt + 1 };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

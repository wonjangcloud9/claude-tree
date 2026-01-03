import type { CodeReview, ReviewStatus } from '@claudetree/shared';

export interface ICodeReviewRepository {
  findBySessionId(sessionId: string): Promise<CodeReview | null>;
  save(review: CodeReview): Promise<void>;
  updateStatus(
    id: string,
    status: ReviewStatus,
    comment?: string
  ): Promise<void>;
}

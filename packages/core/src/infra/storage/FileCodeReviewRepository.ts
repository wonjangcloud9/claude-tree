import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  CodeReview,
  ReviewStatus,
  SerializedCodeReview,
} from '@claudetree/shared';
import type { ICodeReviewRepository } from '../../domain/repositories/ICodeReviewRepository.js';

const REVIEWS_DIR = 'reviews';

export class FileCodeReviewRepository implements ICodeReviewRepository {
  private readonly reviewsDir: string;

  constructor(configDir: string) {
    this.reviewsDir = join(configDir, REVIEWS_DIR);
  }

  async findBySessionId(sessionId: string): Promise<CodeReview | null> {
    try {
      const content = await readFile(this.getFilePath(sessionId), 'utf-8');
      const data = JSON.parse(content) as SerializedCodeReview;
      return this.deserialize(data);
    } catch {
      return null;
    }
  }

  async save(review: CodeReview): Promise<void> {
    await mkdir(this.reviewsDir, { recursive: true });
    const data = this.serialize(review);
    await writeFile(
      this.getFilePath(review.sessionId),
      JSON.stringify(data, null, 2)
    );
  }

  async updateStatus(
    id: string,
    status: ReviewStatus,
    comment?: string
  ): Promise<void> {
    const allFiles = await this.getAllSessionIds();

    for (const sessionId of allFiles) {
      const review = await this.findBySessionId(sessionId);

      if (review && review.id === id) {
        review.status = status;
        review.comment = comment ?? review.comment;
        review.resolvedAt = new Date();
        await this.save(review);
        return;
      }
    }
  }

  private getFilePath(sessionId: string): string {
    return join(this.reviewsDir, `${sessionId}.json`);
  }

  private async getAllSessionIds(): Promise<string[]> {
    try {
      const { readdir } = await import('node:fs/promises');
      const files = await readdir(this.reviewsDir);
      return files
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace('.json', ''));
    } catch {
      return [];
    }
  }

  private serialize(review: CodeReview): SerializedCodeReview {
    return {
      ...review,
      requestedAt: review.requestedAt.toISOString(),
      resolvedAt: review.resolvedAt?.toISOString() ?? null,
    };
  }

  private deserialize(data: SerializedCodeReview): CodeReview {
    return {
      ...data,
      requestedAt: new Date(data.requestedAt),
      resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : null,
    };
  }
}

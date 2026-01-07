import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SerializedCodeReview } from '@claudetree/shared';

const createTestReview = (
  overrides: Partial<SerializedCodeReview> = {}
): SerializedCodeReview => ({
  id: 'review-1',
  sessionId: 'test-session',
  status: 'pending',
  comment: null,
  changes: [
    { path: 'src/index.ts', additions: 10, deletions: 5, status: 'modified' },
  ],
  requestedAt: '2024-01-01T00:00:00.000Z',
  resolvedAt: null,
  ...overrides,
});

const createMockGetRequest = (): Request => {
  return new Request('http://localhost:3000/api/sessions/test-id/review');
};

const createMockPatchRequest = (body: object): Request => {
  return new Request('http://localhost:3000/api/sessions/test-id/review', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
};

const createParams = (id: string) => ({
  params: Promise.resolve({ id }),
});

let testDir: string;
let originalEnv: string | undefined;

beforeAll(async () => {
  testDir = await mkdtemp(join(tmpdir(), 'web-api-review-test-'));
  originalEnv = process.env.CLAUDETREE_ROOT;
  process.env.CLAUDETREE_ROOT = testDir;
});

afterAll(async () => {
  process.env.CLAUDETREE_ROOT = originalEnv;
  await rm(testDir, { recursive: true, force: true });
});

describe('GET /api/sessions/[id]/review', () => {
  it('should return null when no review exists', async () => {
    const { GET } = await import('./route');
    const response = await GET(createMockGetRequest(), createParams('no-review'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toBeNull();
  });

  it('should return review when it exists', async () => {
    const reviewsDir = join(testDir, '.claudetree', 'reviews');
    await mkdir(reviewsDir, { recursive: true });

    const review = createTestReview({ status: 'approved' });
    await writeFile(
      join(reviewsDir, 'has-review.json'),
      JSON.stringify(review)
    );

    const { GET } = await import('./route');
    const response = await GET(createMockGetRequest(), createParams('has-review'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('approved');
    expect(data.changes).toHaveLength(1);
  });
});

describe('PATCH /api/sessions/[id]/review', () => {
  it('should return 404 when review not found', async () => {
    const { PATCH } = await import('./route');
    const response = await PATCH(
      createMockPatchRequest({ status: 'approved' }),
      createParams('no-review-patch')
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Review not found');
  });

  it('should approve review successfully', async () => {
    const reviewsDir = join(testDir, '.claudetree', 'reviews');
    await mkdir(reviewsDir, { recursive: true });

    const review = createTestReview({ id: 'approve-review' });
    await writeFile(
      join(reviewsDir, 'approve-review-session.json'),
      JSON.stringify(review)
    );

    const { PATCH } = await import('./route');
    const response = await PATCH(
      createMockPatchRequest({ status: 'approved', comment: 'LGTM!' }),
      createParams('approve-review-session')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.review.status).toBe('approved');
    expect(data.review.comment).toBe('LGTM!');
    expect(data.review.resolvedAt).toBeDefined();

    const saved = JSON.parse(
      await readFile(join(reviewsDir, 'approve-review-session.json'), 'utf-8')
    );
    expect(saved.status).toBe('approved');
  });

  it('should request changes successfully', async () => {
    const reviewsDir = join(testDir, '.claudetree', 'reviews');
    await mkdir(reviewsDir, { recursive: true });

    const review = createTestReview({ id: 'request-changes-review' });
    await writeFile(
      join(reviewsDir, 'request-changes-session.json'),
      JSON.stringify(review)
    );

    const { PATCH } = await import('./route');
    const response = await PATCH(
      createMockPatchRequest({
        status: 'changes_requested',
        comment: 'Please fix error handling',
      }),
      createParams('request-changes-session')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.review.status).toBe('changes_requested');
    expect(data.review.comment).toBe('Please fix error handling');
  });

  it('should reject review successfully', async () => {
    const reviewsDir = join(testDir, '.claudetree', 'reviews');
    await mkdir(reviewsDir, { recursive: true });

    const review = createTestReview({ id: 'reject-review' });
    await writeFile(
      join(reviewsDir, 'reject-review-session.json'),
      JSON.stringify(review)
    );

    const { PATCH } = await import('./route');
    const response = await PATCH(
      createMockPatchRequest({ status: 'rejected' }),
      createParams('reject-review-session')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.review.status).toBe('rejected');
  });
});

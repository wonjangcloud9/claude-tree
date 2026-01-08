import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SerializedCodeReview } from '@claudetree/shared';
import { createApiErrorHandler, isExpectedError } from '@/lib/api-error';

const CONFIG_DIR = '.claudetree';
const REVIEWS_DIR = 'reviews';

interface Params {
  params: Promise<{ id: string }>;
}

const handleGetError = createApiErrorHandler('GET /api/sessions/[id]/review', {
  defaultMessage: 'Failed to read review',
});

const handlePatchError = createApiErrorHandler('PATCH /api/sessions/[id]/review', {
  defaultMessage: 'Failed to update review',
});

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const cwd = process.env.CLAUDETREE_ROOT || process.cwd();
    const reviewPath = join(cwd, CONFIG_DIR, REVIEWS_DIR, `${id}.json`);

    try {
      const content = await readFile(reviewPath, 'utf-8');
      const review = JSON.parse(content) as SerializedCodeReview;
      return NextResponse.json(review);
    } catch (error) {
      // No review file yet - expected for new sessions
      if (isExpectedError(error)) {
        return NextResponse.json(null);
      }
      throw error;
    }
  } catch (error) {
    return handleGetError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, comment } = body as {
      status: 'approved' | 'rejected' | 'changes_requested';
      comment?: string;
    };

    const cwd = process.env.CLAUDETREE_ROOT || process.cwd();
    const reviewPath = join(cwd, CONFIG_DIR, REVIEWS_DIR, `${id}.json`);

    let review: SerializedCodeReview;
    try {
      const content = await readFile(reviewPath, 'utf-8');
      review = JSON.parse(content);
    } catch (error) {
      if (isExpectedError(error)) {
        return NextResponse.json(
          { error: 'Review not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    review.status = status;
    review.comment = comment ?? review.comment;
    review.resolvedAt = new Date().toISOString();

    await writeFile(reviewPath, JSON.stringify(review, null, 2));

    return NextResponse.json({ success: true, review });
  } catch (error) {
    return handlePatchError(error);
  }
}

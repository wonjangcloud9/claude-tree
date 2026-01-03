import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SerializedCodeReview } from '@claudetree/shared';

const CONFIG_DIR = '.claudetree';
const REVIEWS_DIR = 'reviews';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const cwd = process.cwd();
    const reviewPath = join(cwd, CONFIG_DIR, REVIEWS_DIR, `${id}.json`);

    try {
      const content = await readFile(reviewPath, 'utf-8');
      const review = JSON.parse(content) as SerializedCodeReview;
      return NextResponse.json(review);
    } catch {
      return NextResponse.json(null);
    }
  } catch {
    return NextResponse.json(
      { error: 'Failed to read review' },
      { status: 500 }
    );
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

    const cwd = process.cwd();
    const reviewPath = join(cwd, CONFIG_DIR, REVIEWS_DIR, `${id}.json`);

    let review: SerializedCodeReview;
    try {
      const content = await readFile(reviewPath, 'utf-8');
      review = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    review.status = status;
    review.comment = comment ?? review.comment;
    review.resolvedAt = new Date().toISOString();

    await writeFile(reviewPath, JSON.stringify(review, null, 2));

    return NextResponse.json({ success: true, review });
  } catch {
    return NextResponse.json(
      { error: 'Failed to update review' },
      { status: 500 }
    );
  }
}

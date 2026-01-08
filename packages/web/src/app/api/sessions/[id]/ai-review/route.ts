import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const CONFIG_DIR = '.claudetree';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const cwd = process.env.CLAUDETREE_ROOT || process.cwd();
    const reviewPath = join(cwd, CONFIG_DIR, 'ai-reviews', `${id}.json`);

    try {
      const content = await readFile(reviewPath, 'utf-8');
      const review = JSON.parse(content);
      return NextResponse.json(review);
    } catch {
      // No AI review available yet
      return NextResponse.json(null);
    }
  } catch (error) {
    console.error('Error fetching AI review:', error);
    return NextResponse.json({ error: 'Failed to fetch AI review' }, { status: 500 });
  }
}

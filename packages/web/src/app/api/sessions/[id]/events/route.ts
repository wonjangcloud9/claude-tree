import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SerializedSessionEvent } from '@claudetree/shared';
import { createApiErrorHandler, isExpectedError } from '@/lib/api-error';

const CONFIG_DIR = '.claudetree';
const EVENTS_DIR = 'events';

interface Params {
  params: Promise<{ id: string }>;
}

const handleError = createApiErrorHandler('GET /api/sessions/[id]/events', {
  defaultMessage: 'Failed to read events',
});

export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

    const cwd = process.env.CLAUDETREE_ROOT || process.cwd();
    const eventsPath = join(cwd, CONFIG_DIR, EVENTS_DIR, `${id}.json`);

    let events: SerializedSessionEvent[] = [];
    try {
      const content = await readFile(eventsPath, 'utf-8');
      events = JSON.parse(content);
    } catch (error) {
      // No events file yet - expected for new sessions
      if (!isExpectedError(error)) {
        throw error;
      }
    }

    const total = events.length;
    const sliced = events.slice(offset, offset + limit);

    return NextResponse.json({
      events: sliced,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    return handleError(error);
  }
}

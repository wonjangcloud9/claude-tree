import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SerializedSessionEvent } from '@claudetree/shared';

const createTestEvent = (
  overrides: Partial<SerializedSessionEvent> = {}
): SerializedSessionEvent => ({
  id: 'event-1',
  sessionId: 'test-session',
  type: 'output',
  content: 'Test event content',
  timestamp: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const createMockRequest = (url: string): Request => {
  return new Request(url);
};

const createParams = (id: string) => ({
  params: Promise.resolve({ id }),
});

let testDir: string;
let originalEnv: string | undefined;

beforeAll(async () => {
  testDir = await mkdtemp(join(tmpdir(), 'web-api-events-test-'));
  originalEnv = process.env.CLAUDETREE_ROOT;
  process.env.CLAUDETREE_ROOT = testDir;
});

afterAll(async () => {
  process.env.CLAUDETREE_ROOT = originalEnv;
  await rm(testDir, { recursive: true, force: true });
});

describe('GET /api/sessions/[id]/events', () => {
  it('should return empty array when no events exist', async () => {
    const { GET } = await import('./route');
    const response = await GET(
      createMockRequest('http://localhost:3000/api/sessions/no-events/events'),
      createParams('no-events')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.events).toEqual([]);
    expect(data.total).toBe(0);
    expect(data.hasMore).toBe(false);
  });

  it('should return events for session', async () => {
    const eventsDir = join(testDir, '.claudetree', 'events');
    await mkdir(eventsDir, { recursive: true });

    const events = [
      createTestEvent({ id: 'e1', content: 'Event 1' }),
      createTestEvent({ id: 'e2', content: 'Event 2' }),
      createTestEvent({ id: 'e3', content: 'Event 3' }),
    ];
    await writeFile(
      join(eventsDir, 'session-with-events.json'),
      JSON.stringify(events)
    );

    const { GET } = await import('./route');
    const response = await GET(
      createMockRequest('http://localhost:3000/api/sessions/session-with-events/events'),
      createParams('session-with-events')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.events).toHaveLength(3);
    expect(data.total).toBe(3);
    expect(data.hasMore).toBe(false);
  });

  it('should support pagination with limit', async () => {
    const eventsDir = join(testDir, '.claudetree', 'events');
    await mkdir(eventsDir, { recursive: true });

    const events = Array.from({ length: 10 }, (_, i) =>
      createTestEvent({ id: `e${i}`, content: `Event ${i}` })
    );
    await writeFile(join(eventsDir, 'many-events.json'), JSON.stringify(events));

    const { GET } = await import('./route');
    const response = await GET(
      createMockRequest('http://localhost:3000/api/sessions/many-events/events?limit=3'),
      createParams('many-events')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.events).toHaveLength(3);
    expect(data.total).toBe(10);
    expect(data.hasMore).toBe(true);
  });

  it('should support pagination with offset', async () => {
    const eventsDir = join(testDir, '.claudetree', 'events');
    await mkdir(eventsDir, { recursive: true });

    const events = Array.from({ length: 10 }, (_, i) =>
      createTestEvent({ id: `event-${i}`, content: `Event ${i}` })
    );
    await writeFile(join(eventsDir, 'offset-events.json'), JSON.stringify(events));

    const { GET } = await import('./route');
    const response = await GET(
      createMockRequest('http://localhost:3000/api/sessions/offset-events/events?offset=8&limit=5'),
      createParams('offset-events')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.events).toHaveLength(2);
    expect(data.total).toBe(10);
    expect(data.hasMore).toBe(false);
  });
});

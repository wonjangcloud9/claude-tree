import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileEventRepository } from './FileEventRepository.js';
import type { SessionEvent } from '@claudetree/shared';

describe('FileEventRepository', () => {
  let testDir: string;
  let repo: FileEventRepository;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-event-test-'));
    repo = new FileEventRepository(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  const createTestEvent = (overrides: Partial<SessionEvent> = {}): SessionEvent => ({
    id: 'event-1',
    sessionId: 'session-1',
    type: 'output',
    content: 'Test content',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  });

  describe('append and findBySessionId', () => {
    it('should append and retrieve events', async () => {
      const event = createTestEvent();

      await repo.append(event);
      const events = await repo.findBySessionId(event.sessionId);

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe(event.id);
      expect(events[0].content).toBe(event.content);
      expect(events[0].timestamp).toEqual(event.timestamp);
    });

    it('should append multiple events to same session', async () => {
      const event1 = createTestEvent({ id: 'e1' });
      const event2 = createTestEvent({ id: 'e2', content: 'Second event' });

      await repo.append(event1);
      await repo.append(event2);
      const events = await repo.findBySessionId('session-1');

      expect(events).toHaveLength(2);
      expect(events[0].id).toBe('e1');
      expect(events[1].id).toBe('e2');
    });

    it('should return empty array for non-existent session', async () => {
      const events = await repo.findBySessionId('non-existent');
      expect(events).toEqual([]);
    });
  });

  describe('session filtering', () => {
    it('should filter events by session id', async () => {
      await repo.append(createTestEvent({ id: 'e1', sessionId: 'session-1' }));
      await repo.append(createTestEvent({ id: 'e2', sessionId: 'session-2' }));
      await repo.append(createTestEvent({ id: 'e3', sessionId: 'session-1' }));

      const session1Events = await repo.findBySessionId('session-1');
      const session2Events = await repo.findBySessionId('session-2');

      expect(session1Events).toHaveLength(2);
      expect(session2Events).toHaveLength(1);
      expect(session1Events.map((e) => e.id)).toEqual(['e1', 'e3']);
      expect(session2Events[0].id).toBe('e2');
    });
  });

  describe('getLatest', () => {
    it('should return latest N events', async () => {
      await repo.append(createTestEvent({ id: 'e1' }));
      await repo.append(createTestEvent({ id: 'e2' }));
      await repo.append(createTestEvent({ id: 'e3' }));

      const latest = await repo.getLatest('session-1', 2);

      expect(latest).toHaveLength(2);
      expect(latest[0].id).toBe('e2');
      expect(latest[1].id).toBe('e3');
    });

    it('should return all events if limit exceeds count', async () => {
      await repo.append(createTestEvent({ id: 'e1' }));

      const latest = await repo.getLatest('session-1', 10);

      expect(latest).toHaveLength(1);
    });

    it('should return empty array for non-existent session', async () => {
      const latest = await repo.getLatest('non-existent', 5);
      expect(latest).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should clear all events for a session', async () => {
      await repo.append(createTestEvent({ id: 'e1' }));
      await repo.append(createTestEvent({ id: 'e2' }));

      await repo.clear('session-1');
      const events = await repo.findBySessionId('session-1');

      expect(events).toEqual([]);
    });

    it('should not affect other sessions', async () => {
      await repo.append(createTestEvent({ id: 'e1', sessionId: 'session-1' }));
      await repo.append(createTestEvent({ id: 'e2', sessionId: 'session-2' }));

      await repo.clear('session-1');

      const session1Events = await repo.findBySessionId('session-1');
      const session2Events = await repo.findBySessionId('session-2');

      expect(session1Events).toEqual([]);
      expect(session2Events).toHaveLength(1);
    });
  });

  describe('event rotation', () => {
    it('should trim events when exceeding MAX_EVENTS (1000)', async () => {
      // Manually create a file with 1000 events
      const eventsDir = join(testDir, 'events');
      await mkdir(eventsDir, { recursive: true });

      const existingEvents = Array.from({ length: 1000 }, (_, i) => ({
        id: `existing-${i}`,
        sessionId: 'session-1',
        type: 'output',
        content: `Event ${i}`,
        timestamp: new Date('2024-01-01').toISOString(),
      }));

      await writeFile(
        join(eventsDir, 'session-1.json'),
        JSON.stringify(existingEvents)
      );

      // Append one more event
      await repo.append(createTestEvent({ id: 'new-event' }));

      const events = await repo.findBySessionId('session-1');

      expect(events).toHaveLength(1000);
      expect(events[0].id).toBe('existing-1');
      expect(events[999].id).toBe('new-event');
    });
  });

  describe('file system error handling', () => {
    it('should return empty array when file is corrupted', async () => {
      const eventsDir = join(testDir, 'events');
      await mkdir(eventsDir, { recursive: true });
      await writeFile(join(eventsDir, 'session-1.json'), 'invalid json');

      const events = await repo.findBySessionId('session-1');

      expect(events).toEqual([]);
    });

    it('should create events directory if not exists', async () => {
      const event = createTestEvent();

      await repo.append(event);

      const content = await readFile(
        join(testDir, 'events', 'session-1.json'),
        'utf-8'
      );
      const parsed = JSON.parse(content);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('event-1');
    });
  });

  describe('serialization', () => {
    it('should serialize Date to ISO string and deserialize back', async () => {
      const timestamp = new Date('2024-06-15T12:30:45.123Z');
      const event = createTestEvent({ timestamp });

      await repo.append(event);

      // Verify file content has ISO string
      const content = await readFile(
        join(testDir, 'events', 'session-1.json'),
        'utf-8'
      );
      const parsed = JSON.parse(content);
      expect(parsed[0].timestamp).toBe('2024-06-15T12:30:45.123Z');

      // Verify deserialized event has Date object
      const events = await repo.findBySessionId('session-1');
      expect(events[0].timestamp).toBeInstanceOf(Date);
      expect(events[0].timestamp.toISOString()).toBe('2024-06-15T12:30:45.123Z');
    });

    it('should preserve metadata in events', async () => {
      const event = createTestEvent({
        metadata: { key: 'value', nested: { foo: 'bar' } },
      });

      await repo.append(event);
      const events = await repo.findBySessionId('session-1');

      expect(events[0].metadata).toEqual({ key: 'value', nested: { foo: 'bar' } });
    });
  });
});

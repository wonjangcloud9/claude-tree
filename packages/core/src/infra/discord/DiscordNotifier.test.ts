import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DiscordNotifier } from './DiscordNotifier.js';

describe('DiscordNotifier', () => {
  let notifier: DiscordNotifier;
  let fetchMock: ReturnType<typeof vi.fn>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    notifier = new DiscordNotifier('https://discord.com/api/webhooks/test');
    fetchMock = vi.fn().mockResolvedValue(
      new Response('ok', { status: 200 }),
    );
    globalThis.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('notify', () => {
    it('sends POST to webhook URL', async () => {
      const result = await notifier.notify({ content: 'test' });

      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    it('returns false on fetch error', async () => {
      fetchMock.mockRejectedValue(new Error('network'));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await notifier.notify({ content: 'test' });
      expect(result).toBe(false);
    });
  });

  describe('notifySession', () => {
    it('sends session embed for completed session', async () => {
      await notifier.notifySession({
        sessionId: 'abc12345',
        status: 'completed',
        issueNumber: 42,
        branch: 'issue-42-fix',
        duration: 120000,
        cost: 0.05,
      });

      const body = JSON.parse(
        fetchMock.mock.calls[0]![1].body,
      );
      expect(body.embeds).toHaveLength(1);
      expect(body.embeds[0].title).toContain('#42');
      expect(body.embeds[0].color).toBe(0x36a64f); // green
    });

    it('sends failed session with error', async () => {
      await notifier.notifySession({
        sessionId: 'abc12345',
        status: 'failed',
        error: 'Process crashed',
      });

      const body = JSON.parse(
        fetchMock.mock.calls[0]![1].body,
      );
      expect(body.embeds[0].color).toBe(0xdc3545); // red
      expect(body.embeds[0].fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Error', value: 'Process crashed' }),
        ]),
      );
    });
  });

  describe('notifyBatch', () => {
    it('sends batch summary', async () => {
      await notifier.notifyBatch([
        { issue: '#1', status: 'completed' },
        { issue: '#2', status: 'failed', error: 'timeout' },
      ]);

      const body = JSON.parse(
        fetchMock.mock.calls[0]![1].body,
      );
      expect(body.embeds[0].title).toContain('Bustercall');
      expect(body.embeds[0].fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Completed', value: '1' }),
          expect.objectContaining({ name: 'Failed', value: '1' }),
        ]),
      );
    });

    it('uses green when no failures', async () => {
      await notifier.notifyBatch([
        { issue: '#1', status: 'completed' },
      ]);

      const body = JSON.parse(
        fetchMock.mock.calls[0]![1].body,
      );
      expect(body.embeds[0].color).toBe(0x36a64f);
    });
  });
});

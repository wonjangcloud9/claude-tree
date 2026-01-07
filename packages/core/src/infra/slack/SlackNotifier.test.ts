import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SlackNotifier } from './SlackNotifier.js';
import type { SlackMessage, SessionNotification } from './SlackNotifier.js';

describe('SlackNotifier', () => {
  const webhookUrl = 'https://hooks.slack.com/services/T00/B00/XXX';
  let notifier: SlackNotifier;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    notifier = new SlackNotifier(webhookUrl);
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('notify', () => {
    it('should send notification successfully', async () => {
      fetchMock.mockResolvedValue({ ok: true });

      const message: SlackMessage = { text: 'Hello, Slack!' };
      const result = await notifier.notify(message);

      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
    });

    it('should return false when response is not ok', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 400 });

      const message: SlackMessage = { text: 'Test' };
      const result = await notifier.notify(message);

      expect(result).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      fetchMock.mockRejectedValue(new Error('Network error'));

      const message: SlackMessage = { text: 'Test' };
      const result = await notifier.notify(message);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Slack] Notification failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should send message with blocks', async () => {
      fetchMock.mockResolvedValue({ ok: true });

      const message: SlackMessage = {
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: 'Header' },
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: 'Content' },
          },
        ],
      };
      const result = await notifier.notify(message);

      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
    });

    it('should send message with attachments', async () => {
      fetchMock.mockResolvedValue({ ok: true });

      const message: SlackMessage = {
        attachments: [
          {
            color: '#36a64f',
            title: 'Success',
            text: 'Operation completed',
            fields: [{ title: 'Status', value: 'OK', short: true }],
          },
        ],
      };
      const result = await notifier.notify(message);

      expect(result).toBe(true);
    });
  });

  describe('notifySession', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValue({ ok: true });
    });

    it('should send started session notification', async () => {
      const notification: SessionNotification = {
        sessionId: 'abc12345-6789',
        status: 'started',
        issueNumber: 42,
        branch: 'issue-42-feature',
      };

      const result = await notifier.notifySession(notification);

      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalled();

      const body = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body);
      expect(body.attachments[0].color).toBe('#3498db');
      expect(body.attachments[0].title).toBe('Issue #42');
      expect(body.attachments[0].fields).toContainEqual({
        title: 'Status',
        value: ':rocket: Session Started',
        short: true,
      });
      expect(body.attachments[0].fields).toContainEqual({
        title: 'Branch',
        value: 'issue-42-feature',
        short: true,
      });
    });

    it('should send completed session notification', async () => {
      const notification: SessionNotification = {
        sessionId: 'abc12345-6789',
        status: 'completed',
        duration: 125000,
      };

      await notifier.notifySession(notification);

      const body = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body);
      expect(body.attachments[0].color).toBe('#36a64f');
      expect(body.attachments[0].title).toBe('Session abc12345');
      expect(body.attachments[0].fields).toContainEqual({
        title: 'Status',
        value: ':white_check_mark: Session Completed',
        short: true,
      });
      expect(body.attachments[0].fields).toContainEqual({
        title: 'Duration',
        value: '2m 5s',
        short: true,
      });
    });

    it('should send failed session notification with error', async () => {
      const notification: SessionNotification = {
        sessionId: 'abc12345-6789',
        status: 'failed',
        error: 'Build failed with exit code 1',
      };

      await notifier.notifySession(notification);

      const body = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body);
      expect(body.attachments[0].color).toBe('#dc3545');
      expect(body.attachments[0].fields).toContainEqual({
        title: 'Status',
        value: ':x: Session Failed',
        short: true,
      });
      expect(body.attachments[0].fields).toContainEqual({
        title: 'Error',
        value: 'Build failed with exit code 1',
        short: false,
      });
    });

    it('should send paused session notification', async () => {
      const notification: SessionNotification = {
        sessionId: 'abc12345-6789',
        status: 'paused',
      };

      await notifier.notifySession(notification);

      const body = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body);
      expect(body.attachments[0].color).toBe('#ffc107');
      expect(body.attachments[0].fields).toContainEqual({
        title: 'Status',
        value: ':pause_button: Session Paused',
        short: true,
      });
    });

    it('should use session ID when issue number is not provided', async () => {
      const notification: SessionNotification = {
        sessionId: 'abc12345-6789',
        status: 'started',
      };

      await notifier.notifySession(notification);

      const body = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body);
      expect(body.attachments[0].title).toBe('Session abc12345');
    });
  });

  describe('notifyBatch', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValue({ ok: true });
    });

    it('should send batch notification with all completed', async () => {
      const results = [
        { issue: '#1', status: 'completed' as const },
        { issue: '#2', status: 'completed' as const },
        { issue: '#3', status: 'completed' as const },
      ];

      const result = await notifier.notifyBatch(results);

      expect(result).toBe(true);
      const body = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body);
      expect(body.blocks[0].text.text).toBe(':white_check_mark: Batch Complete');
      expect(body.blocks[1].fields).toContainEqual({
        type: 'mrkdwn',
        text: '*Completed:* 3',
      });
      expect(body.blocks[1].fields).toContainEqual({
        type: 'mrkdwn',
        text: '*Failed:* 0',
      });
      expect(body.blocks).toHaveLength(2);
    });

    it('should send batch notification with failures', async () => {
      const results = [
        { issue: '#1', status: 'completed' as const },
        { issue: '#2', status: 'failed' as const, error: 'Test failed' },
        { issue: '#3', status: 'failed' as const, error: 'Build error' },
      ];

      const result = await notifier.notifyBatch(results);

      expect(result).toBe(true);
      const body = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body);
      expect(body.blocks[0].text.text).toBe(':warning: Batch Complete');
      expect(body.blocks[1].fields).toContainEqual({
        type: 'mrkdwn',
        text: '*Completed:* 1',
      });
      expect(body.blocks[1].fields).toContainEqual({
        type: 'mrkdwn',
        text: '*Failed:* 2',
      });
      expect(body.blocks[2].text.text).toContain('#2: Test failed');
      expect(body.blocks[2].text.text).toContain('#3: Build error');
    });

    it('should handle failed items without error message', async () => {
      const results = [
        { issue: '#1', status: 'failed' as const },
      ];

      await notifier.notifyBatch(results);

      const body = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body);
      expect(body.blocks[2].text.text).toContain('#1: Unknown error');
    });

    it('should handle empty results', async () => {
      const results: Array<{ issue: string; status: 'completed' | 'failed' }> = [];

      const result = await notifier.notifyBatch(results);

      expect(result).toBe(true);
      const body = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body);
      expect(body.blocks[1].fields).toContainEqual({
        type: 'mrkdwn',
        text: '*Completed:* 0',
      });
      expect(body.blocks[1].fields).toContainEqual({
        type: 'mrkdwn',
        text: '*Failed:* 0',
      });
    });
  });

  describe('webhook URL validation', () => {
    it('should use provided webhook URL for requests', async () => {
      const customUrl = 'https://custom.webhook.url/endpoint';
      const customNotifier = new SlackNotifier(customUrl);
      fetchMock.mockResolvedValue({ ok: true });

      await customNotifier.notify({ text: 'Test' });

      expect(fetchMock).toHaveBeenCalledWith(customUrl, expect.any(Object));
    });
  });
});

export interface SlackMessage {
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
}

export interface SlackBlock {
  type: 'section' | 'header' | 'divider' | 'context';
  text?: {
    type: 'mrkdwn' | 'plain_text';
    text: string;
  };
  fields?: Array<{
    type: 'mrkdwn' | 'plain_text';
    text: string;
  }>;
}

export interface SlackAttachment {
  color: string;
  title?: string;
  text?: string;
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean;
  }>;
}

export interface SessionNotification {
  sessionId: string;
  status: 'started' | 'completed' | 'failed' | 'paused';
  issueNumber?: number | null;
  branch?: string;
  worktreePath?: string;
  error?: string;
  duration?: number;
}

export class SlackNotifier {
  constructor(private readonly webhookUrl: string) {}

  async notify(message: SlackMessage): Promise<boolean> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      return response.ok;
    } catch (err) {
      console.error('[Slack] Notification failed:', err);
      return false;
    }
  }

  async notifySession(notification: SessionNotification): Promise<boolean> {
    const message = this.buildSessionMessage(notification);
    return this.notify(message);
  }

  private buildSessionMessage(notification: SessionNotification): SlackMessage {
    const { sessionId, status, issueNumber, branch, error, duration } = notification;

    const statusEmoji =
      status === 'started' ? ':rocket:' :
      status === 'completed' ? ':white_check_mark:' :
      status === 'failed' ? ':x:' :
      status === 'paused' ? ':pause_button:' :
      ':grey_question:';

    const statusColor =
      status === 'completed' ? '#36a64f' :
      status === 'failed' ? '#dc3545' :
      status === 'paused' ? '#ffc107' :
      '#3498db';

    const title = issueNumber
      ? `Issue #${issueNumber}`
      : `Session ${sessionId.slice(0, 8)}`;

    const statusText =
      status === 'started' ? 'Session Started' :
      status === 'completed' ? 'Session Completed' :
      status === 'failed' ? 'Session Failed' :
      'Session Paused';

    const fields: Array<{ title: string; value: string; short?: boolean }> = [
      { title: 'Status', value: `${statusEmoji} ${statusText}`, short: true },
    ];

    if (branch) {
      fields.push({ title: 'Branch', value: branch, short: true });
    }

    if (duration) {
      const mins = Math.floor(duration / 60000);
      const secs = Math.floor((duration % 60000) / 1000);
      fields.push({ title: 'Duration', value: `${mins}m ${secs}s`, short: true });
    }

    if (error) {
      fields.push({ title: 'Error', value: error, short: false });
    }

    return {
      attachments: [
        {
          color: statusColor,
          title,
          fields,
        },
      ],
    };
  }

  async notifyBatch(
    results: Array<{ issue: string; status: 'completed' | 'failed'; error?: string }>
  ): Promise<boolean> {
    const completed = results.filter((r) => r.status === 'completed').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    const emoji = failed === 0 ? ':white_check_mark:' : ':warning:';

    const message: SlackMessage = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} Batch Complete`,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Completed:* ${completed}` },
            { type: 'mrkdwn', text: `*Failed:* ${failed}` },
          ],
        },
      ],
    };

    if (failed > 0) {
      const failedItems = results.filter((r) => r.status === 'failed');
      const failedText = failedItems
        .map((r) => `• ${r.issue}: ${r.error || 'Unknown error'}`)
        .join('\n');

      message.blocks?.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Failed sessions:*\n${failedText}`,
        },
      });
    }

    return this.notify(message);
  }
}

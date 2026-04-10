export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: { text: string };
  timestamp?: string;
}

export interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
}

export interface SessionNotification {
  sessionId: string;
  status: 'started' | 'completed' | 'failed' | 'paused';
  issueNumber?: number | null;
  branch?: string;
  error?: string;
  duration?: number;
  cost?: number;
}

// Discord color values (decimal)
const COLORS = {
  green: 0x36a64f,
  red: 0xdc3545,
  yellow: 0xffc107,
  blue: 0x3498db,
} as const;

export class DiscordNotifier {
  constructor(private readonly webhookUrl: string) {}

  async notify(message: DiscordMessage): Promise<boolean> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
      return response.ok;
    } catch (err) {
      console.error('[Discord] Notification failed:', err);
      return false;
    }
  }

  async notifySession(notification: SessionNotification): Promise<boolean> {
    const embed = this.buildSessionEmbed(notification);
    return this.notify({ embeds: [embed] });
  }

  private buildSessionEmbed(notification: SessionNotification): DiscordEmbed {
    const { sessionId, status, issueNumber, branch, error, duration, cost } = notification;

    const statusEmoji =
      status === 'started' ? '🚀' :
      status === 'completed' ? '✅' :
      status === 'failed' ? '❌' :
      '⏸️';

    const color =
      status === 'completed' ? COLORS.green :
      status === 'failed' ? COLORS.red :
      status === 'paused' ? COLORS.yellow :
      COLORS.blue;

    const title = issueNumber
      ? `${statusEmoji} Issue #${issueNumber}`
      : `${statusEmoji} Session ${sessionId.slice(0, 8)}`;

    const fields: DiscordEmbed['fields'] = [
      { name: 'Status', value: status, inline: true },
    ];

    if (branch) {
      fields.push({ name: 'Branch', value: `\`${branch}\``, inline: true });
    }

    if (duration) {
      const min = Math.floor(duration / 60000);
      const sec = Math.floor((duration % 60000) / 1000);
      fields.push({ name: 'Duration', value: `${min}m ${sec}s`, inline: true });
    }

    if (cost !== undefined) {
      fields.push({ name: 'Cost', value: `$${cost.toFixed(4)}`, inline: true });
    }

    if (error) {
      fields.push({ name: 'Error', value: error.slice(0, 200), inline: false });
    }

    return {
      title,
      color,
      fields,
      footer: { text: 'claudetree' },
      timestamp: new Date().toISOString(),
    };
  }

  async notifyBatch(
    results: Array<{ issue: string; status: 'completed' | 'failed'; error?: string }>,
  ): Promise<boolean> {
    const completed = results.filter((r) => r.status === 'completed').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const color = failed === 0 ? COLORS.green : COLORS.yellow;

    const fields: DiscordEmbed['fields'] = [
      { name: 'Completed', value: String(completed), inline: true },
      { name: 'Failed', value: String(failed), inline: true },
      { name: 'Total', value: String(results.length), inline: true },
    ];

    if (failed > 0) {
      const failedText = results
        .filter((r) => r.status === 'failed')
        .map((r) => `• ${r.issue}: ${r.error ?? 'Unknown'}`)
        .join('\n');
      fields.push({ name: 'Failed Sessions', value: failedText, inline: false });
    }

    return this.notify({
      embeds: [{
        title: `${failed === 0 ? '✅' : '⚠️'} Bustercall Complete`,
        color,
        fields,
        footer: { text: 'claudetree' },
        timestamp: new Date().toISOString(),
      }],
    });
  }
}

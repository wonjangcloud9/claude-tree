import { execa, type ResultPromise } from 'execa';
import { randomUUID } from 'node:crypto';
import type {
  IClaudeSessionAdapter,
  ClaudeSessionConfig,
  ClaudeSessionResult,
  ClaudeOutput,
} from '../../domain/repositories/ISessionRepository.js';

export class ClaudeSessionAdapter implements IClaudeSessionAdapter {
  private processes = new Map<string, ResultPromise>();

  async start(config: ClaudeSessionConfig): Promise<ClaudeSessionResult> {
    const args = this.buildArgs(config);
    const processId = randomUUID();

    const proc = execa('claude', args, {
      cwd: config.workingDir,
      all: true,
    });

    this.processes.set(processId, proc);

    return {
      processId,
      claudeSessionId: null, // Will be set when we get the result
    };
  }

  async resume(sessionId: string, prompt: string): Promise<ClaudeSessionResult> {
    const processId = randomUUID();

    const proc = execa('claude', [
      '-p', prompt,
      '--resume', sessionId,
      '--output-format', 'stream-json',
    ]);

    this.processes.set(processId, proc);

    return {
      processId,
      claudeSessionId: sessionId,
    };
  }

  async stop(processId: string): Promise<void> {
    const proc = this.processes.get(processId);
    if (proc) {
      proc.kill();
      this.processes.delete(processId);
    }
  }

  async *getOutput(processId: string): AsyncIterable<ClaudeOutput> {
    const proc = this.processes.get(processId);
    if (!proc || !proc.all) return;

    for await (const chunk of proc.all) {
      const lines = chunk.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        yield this.parseStreamOutput(line);
      }
    }
  }

  async isClaudeAvailable(): Promise<boolean> {
    try {
      await execa('which', ['claude']);
      return true;
    } catch {
      return false;
    }
  }

  buildArgs(config: ClaudeSessionConfig): string[] {
    const args: string[] = [
      '-p', config.prompt,
      '--output-format', 'stream-json',
    ];

    if (config.allowedTools?.length) {
      args.push('--allowedTools', config.allowedTools.join(','));
    }

    if (config.systemPrompt) {
      args.push('--append-system-prompt', config.systemPrompt);
    }

    if (config.resume) {
      args.push('--resume', config.resume);
    }

    return args;
  }

  parseStreamOutput(line: string): ClaudeOutput {
    const timestamp = new Date();

    try {
      const data = JSON.parse(line);

      if (data.type === 'result') {
        return {
          type: 'done',
          content: data.session_id || '',
          timestamp,
        };
      }

      if (data.type === 'assistant' && data.message?.content) {
        const content = data.message.content[0];

        if (content?.type === 'tool_use') {
          return {
            type: 'tool_use',
            content: `${content.name}: ${JSON.stringify(content.input)}`,
            timestamp,
          };
        }

        if (content?.type === 'text') {
          return {
            type: 'text',
            content: content.text,
            timestamp,
          };
        }
      }

      return {
        type: 'text',
        content: JSON.stringify(data),
        timestamp,
      };
    } catch {
      return {
        type: 'text',
        content: line,
        timestamp,
      };
    }
  }
}

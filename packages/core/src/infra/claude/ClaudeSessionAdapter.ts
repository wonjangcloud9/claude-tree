import { EventEmitter } from 'node:events';
import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import { randomUUID } from 'node:crypto';
import { execa } from 'execa';
import type {
  IClaudeSessionAdapter,
  ClaudeSessionConfig,
  ClaudeSessionResult,
  ClaudeOutput,
} from '../../domain/repositories/ISessionRepository.js';

export interface ClaudeOutputEvent {
  processId: string;
  output: ClaudeOutput;
}

export class ClaudeSessionAdapter
  extends EventEmitter
  implements IClaudeSessionAdapter
{
  private processes = new Map<string, ChildProcess>();

  async start(config: ClaudeSessionConfig): Promise<ClaudeSessionResult> {
    const args = this.buildArgs(config);
    const processId = randomUUID();

    console.log(`[ClaudeAdapter] Spawning: claude ${args.join(' ').slice(0, 100)}...`);
    console.log(`[ClaudeAdapter] Working dir: ${config.workingDir}`);

    const proc = spawn('claude', args, {
      cwd: config.workingDir,
      stdio: ['ignore', 'pipe', 'pipe'],  // stdin을 ignore로 변경
    });

    proc.on('error', (err) => {
      console.error(`[ClaudeAdapter] Process error: ${err.message}`);
    });

    proc.on('exit', (code, signal) => {
      console.log(`[ClaudeAdapter] Process exited: code=${code}, signal=${signal}`);
    });

    if (proc.stderr) {
      proc.stderr.on('data', (data) => {
        console.error(`[ClaudeAdapter] stderr: ${data.toString()}`);
      });
    }

    this.processes.set(processId, proc);

    return {
      processId,
      claudeSessionId: null,
    };
  }

  async resume(sessionId: string, prompt: string): Promise<ClaudeSessionResult> {
    const processId = randomUUID();

    const proc = spawn('claude', [
      '-p', prompt,
      '--resume', sessionId,
      '--output-format', 'stream-json',
      '--verbose',
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
    console.log(`[ClaudeAdapter] getOutput called for process: ${processId.slice(0, 8)}`);

    if (!proc) {
      console.error(`[ClaudeAdapter] No process found for ID: ${processId.slice(0, 8)}`);
      return;
    }

    if (!proc.stdout) {
      console.error(`[ClaudeAdapter] No stdout for process: ${processId.slice(0, 8)}`);
      return;
    }

    console.log(`[ClaudeAdapter] Setting up readline for stdout...`);

    const rl = createInterface({
      input: proc.stdout,
      crlfDelay: Infinity,
    });

    console.log(`[ClaudeAdapter] Starting to read lines...`);

    for await (const line of rl) {
      console.log(`[ClaudeAdapter] Raw line received (${line.length} chars)`);
      if (!line.trim()) continue;

      const output = this.parseStreamOutput(line);

      this.emit('output', {
        processId,
        output,
      } as ClaudeOutputEvent);

      yield output;
    }

    console.log(`[ClaudeAdapter] Readline ended, waiting for process to close...`);

    // Wait for process to exit
    await new Promise<void>((resolve) => {
      proc.on('close', () => {
        console.log(`[ClaudeAdapter] Process closed`);
        resolve();
      });
    });
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
      '--verbose',
      '--permission-mode', 'acceptEdits',  // 자동 승인
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

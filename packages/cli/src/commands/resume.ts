import { Command } from 'commander';
import { join } from 'node:path';
import { access } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import {
  ClaudeSessionAdapter,
  FileSessionRepository,
  FileEventRepository,
  type ClaudeOutputEvent,
} from '@claudetree/core';
import type { EventType } from '@claudetree/shared';

const CONFIG_DIR = '.claudetree';

interface ResumeOptions {
  prompt?: string;
}

export const resumeCommand = new Command('resume')
  .description('Resume a paused Claude session')
  .argument('<session-id>', 'Session ID (prefix match supported)')
  .option('-p, --prompt <prompt>', 'Additional prompt for resume')
  .action(async (sessionIdArg: string, options: ResumeOptions) => {
    const cwd = process.cwd();
    const configDir = join(cwd, CONFIG_DIR);

    try {
      await access(configDir);
    } catch {
      console.error(
        'Error: claudetree not initialized. Run "claudetree init" first.'
      );
      process.exit(1);
    }

    const sessionRepo = new FileSessionRepository(configDir);
    const sessions = await sessionRepo.findAll();

    // Find session by prefix match
    const session = sessions.find(
      (s) =>
        s.id.startsWith(sessionIdArg) &&
        (s.status === 'paused' || s.status === 'running')
    );

    if (!session) {
      console.error(`No resumable session found matching: ${sessionIdArg}`);
      console.log('\nResumable sessions (paused/running):');
      const resumable = sessions.filter(
        (s) => s.status === 'paused' || s.status === 'running'
      );
      if (resumable.length === 0) {
        console.log('  (none)');
      } else {
        resumable.forEach((s) => {
          console.log(
            `  ${s.id.slice(0, 8)} - ${s.status} - Issue #${s.issueNumber ?? 'N/A'}`
          );
        });
      }
      process.exit(1);
    }

    if (!session.claudeSessionId) {
      console.error('Error: Session has no Claude session ID. Cannot resume.');
      console.log(
        'Hint: This session may not have captured its session ID before pausing.'
      );
      process.exit(1);
    }

    if (!session.worktreePath) {
      console.error('Error: Session has no worktree path. Cannot resume.');
      process.exit(1);
    }

    // Check if worktree still exists
    try {
      await access(session.worktreePath);
    } catch {
      console.error(
        `Error: Worktree no longer exists: ${session.worktreePath}`
      );
      process.exit(1);
    }

    console.log(`Resuming session: ${session.id.slice(0, 8)}`);
    console.log(`  Claude Session: ${session.claudeSessionId.slice(0, 8)}`);
    console.log(`  Worktree: ${session.worktreePath}`);

    const claudeAdapter = new ClaudeSessionAdapter();
    const eventRepo = new FileEventRepository(configDir);

    // Build resume prompt
    const prompt = options.prompt ?? 'Continue from where you left off.';

    // Setup event listener
    claudeAdapter.on('output', async (event: ClaudeOutputEvent) => {
      const { output } = event;
      let eventType: EventType = 'output';
      if (output.type === 'tool_use') eventType = 'tool_call';
      else if (output.type === 'error') eventType = 'error';

      try {
        await eventRepo.append({
          id: randomUUID(),
          sessionId: session.id,
          type: eventType,
          content: output.content,
          timestamp: output.timestamp,
        });
      } catch {
        // Ignore file write errors
      }
    });

    // Resume Claude session
    const result = await claudeAdapter.resume(session.claudeSessionId, prompt);

    // Update session
    session.processId = result.processId;
    session.osProcessId = result.osProcessId;
    session.status = 'running';
    session.lastHeartbeat = new Date();
    session.updatedAt = new Date();
    await sessionRepo.save(session);

    console.log('\nSession resumed. Claude is working...\n');

    // Setup graceful shutdown
    const handleShutdown = async () => {
      console.log('\n[Info] Pausing session...');
      session.status = 'paused';
      session.updatedAt = new Date();
      await sessionRepo.save(session);
      console.log(`Session paused: ${session.id.slice(0, 8)}`);
      process.exit(0);
    };

    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);

    // Stream output
    let outputCount = 0;
    for await (const output of claudeAdapter.getOutput(result.processId)) {
      outputCount++;
      session.lastHeartbeat = new Date();

      if (output.type === 'text') {
        console.log(output.content);
      } else if (output.type === 'tool_use') {
        console.log(`\x1b[36m[Tool]\x1b[0m ${output.content}`);
      } else if (output.type === 'error') {
        console.error(`\x1b[31m[Error]\x1b[0m ${output.content}`);
      } else if (output.type === 'done') {
        console.log(`\x1b[32m[Done]\x1b[0m Session completed`);
        if (output.content) {
          session.claudeSessionId = output.content;
        }
      }

      // Update heartbeat periodically
      if (outputCount % 10 === 0) {
        session.updatedAt = new Date();
        await sessionRepo.save(session);
      }
    }

    // Session completed
    session.status = 'completed';
    session.updatedAt = new Date();
    await sessionRepo.save(session);

    console.log('\nSession completed.');
  });

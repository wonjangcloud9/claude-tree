import { Command } from 'commander';
import { join } from 'node:path';
import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { FileSessionRepository } from '@claudetree/core';
import { exitNotInitialized, exitSessionNotFound, exitWithError } from '../errors.js';

const CONFIG_DIR = '.claudetree';

interface RerunOptions {
  template?: string;
  retry?: string;
  tag?: string[];
  keep: boolean;
}

export const rerunCommand = new Command('rerun')
  .description('Rerun a failed or completed session with the same issue')
  .argument('<session-id>', 'Session ID (prefix match supported)')
  .option('-T, --template <template>', 'Override session template')
  .option('--retry <n>', 'Override auto-retry count')
  .option('--tag <tags...>', 'Additional tags (original tags are preserved)')
  .option('--keep', 'Keep the original session (default: delete it)', false)
  .action(async (sessionIdArg: string, options: RerunOptions) => {
    const cwd = process.cwd();
    const configDir = join(cwd, CONFIG_DIR);

    try {
      await access(configDir);
    } catch {
      exitNotInitialized();
    }

    const sessionRepo = new FileSessionRepository(configDir);
    const sessions = await sessionRepo.findAll();

    const session = sessions.find(
      (s) => s.id === sessionIdArg || s.id.startsWith(sessionIdArg),
    );

    if (!session) {
      exitSessionNotFound(sessionIdArg);
    }

    if (session.status === 'running' || session.status === 'pending') {
      exitWithError(
        `Session is still ${session.status}.`,
        `Run: ct stop ${sessionIdArg}  first, or wait for completion`,
      );
    }

    const issueOrPrompt = session.issueNumber
      ? String(session.issueNumber)
      : session.prompt;

    if (!issueOrPrompt) {
      exitWithError(
        'Session has no issue number or prompt. Cannot rerun.',
        'Start a new session instead: ct start <issue-url>',
      );
    }

    // Build args for ct start
    const args = ['start', issueOrPrompt];

    if (options.template) {
      args.push('--template', options.template);
    }

    if (options.retry) {
      args.push('--retry', options.retry);
    }

    // Merge original tags with new tags
    const allTags = [
      ...(session.tags ?? []).filter((t) => !t.startsWith('rerun:')),
      `rerun:${session.id.slice(0, 8)}`,
      ...(options.tag ?? []),
    ];
    if (allTags.length > 0) {
      args.push('--tag', ...allTags);
    }

    // Delete old session unless --keep
    if (!options.keep) {
      await sessionRepo.delete(session.id);
      console.log(`Deleted old session: ${session.id.slice(0, 8)}`);
    }

    console.log(`Rerunning session for ${session.issueNumber ? `issue #${session.issueNumber}` : 'prompt'}...`);
    console.log(`  Original: ${session.id.slice(0, 8)} (${session.status})`);
    console.log(`  Tags: [${allTags.join(', ')}]`);

    // Spawn new session
    const proc = spawn('claudetree', args, {
      cwd,
      stdio: 'ignore',
      detached: true,
    });

    proc.unref();

    console.log(`\nNew session started. Monitor with: ct status`);
  });

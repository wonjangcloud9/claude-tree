import { Command } from 'commander';
import { join } from 'node:path';
import { access } from 'node:fs/promises';
import { FileSessionRepository } from '@claudetree/core';

const CONFIG_DIR = '.claudetree';

export const tagCommand = new Command('tag')
  .description('Manage session tags')
  .argument('<sessionId>', 'Session ID (or prefix)')
  .argument('<action>', 'Action: add or remove')
  .argument('<tags...>', 'Tags to add or remove')
  .action(async (sessionId: string, action: string, tags: string[]) => {
    if (action !== 'add' && action !== 'remove') {
      console.error(`Error: Invalid action "${action}". Use "add" or "remove".`);
      process.exit(1);
    }

    const cwd = process.cwd();
    const configDir = join(cwd, CONFIG_DIR);

    try {
      await access(configDir);
    } catch {
      console.error('Error: claudetree not initialized. Run "claudetree init" first.');
      process.exit(1);
    }

    const sessionRepo = new FileSessionRepository(configDir);
    const sessions = await sessionRepo.findAll();

    const session = sessions.find(
      (s) => s.id === sessionId || s.id.startsWith(sessionId),
    );

    if (!session) {
      console.error(`Error: Session "${sessionId}" not found.`);
      process.exit(1);
    }

    if (action === 'add') {
      const existing = new Set(session.tags ?? []);
      for (const tag of tags) {
        existing.add(tag);
      }
      session.tags = [...existing];
      await sessionRepo.save(session);
      console.log(`Added tags [${tags.join(', ')}] to session ${session.id.slice(0, 8)}`);
    } else {
      const toRemove = new Set(tags);
      session.tags = (session.tags ?? []).filter((t) => !toRemove.has(t));
      await sessionRepo.save(session);
      console.log(`Removed tags [${tags.join(', ')}] from session ${session.id.slice(0, 8)}`);
    }

    console.log(`Current tags: [${session.tags.join(', ')}]`);
  });

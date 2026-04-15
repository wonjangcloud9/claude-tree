#!/usr/bin/env node

import { createRequire } from 'node:module';
import { program } from 'commander';
import { archiveCommand } from './commands/archive.js';
import { batchCommand } from './commands/batch.js';
import { bustercallCommand } from './commands/bustercall.js';
import { chainCommand } from './commands/chain.js';
import { cleanCommand } from './commands/clean.js';
import { configCommand } from './commands/config.js';
import { diffCommand } from './commands/diff.js';
import { doctorCommand } from './commands/doctor.js';
import { exportCommand } from './commands/export.js';
import { initCommand } from './commands/init.js';
import { listCommand } from './commands/list.js';
import { logCommand } from './commands/log.js';
import { prCommand } from './commands/pr.js';
import { rerunCommand } from './commands/rerun.js';
import { resumeCommand } from './commands/resume.js';
import { startCommand } from './commands/start.js';
import { statsCommand } from './commands/stats.js';
import { statusCommand } from './commands/status.js';
import { stopCommand } from './commands/stop.js';
import { summaryCommand } from './commands/summary.js';
import { tagCommand } from './commands/tag.js';
import { templateCommand } from './commands/template.js';
import { watchCommand } from './commands/watch.js';
import { webCommand } from './commands/web.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

program
  .name('claudetree')
  .description('Issue-to-PR automation: parallel Claude Code sessions with cost tracking & web dashboard')
  .version(version);

program.addCommand(initCommand);
program.addCommand(startCommand);
program.addCommand(statusCommand);
program.addCommand(statsCommand);
program.addCommand(logCommand);
program.addCommand(stopCommand);
program.addCommand(resumeCommand);
program.addCommand(batchCommand);
program.addCommand(bustercallCommand);
program.addCommand(chainCommand);
program.addCommand(configCommand);
program.addCommand(diffCommand);
program.addCommand(exportCommand);
program.addCommand(prCommand);
program.addCommand(rerunCommand);
program.addCommand(summaryCommand);
program.addCommand(tagCommand);
program.addCommand(templateCommand);
program.addCommand(watchCommand);
program.addCommand(webCommand);
program.addCommand(listCommand);
program.addCommand(cleanCommand);
program.addCommand(archiveCommand);
program.addCommand(doctorCommand);

program.addHelpText('after', `
Quick Start:
  $ ct init                              # initialize in your project
  $ ct start <github-issue-url>          # fire and forget
  $ ct status                            # monitor progress
  $ ct pr --all                          # create PRs for completed sessions
  $ ct stats                             # view cost analytics

Docs: https://github.com/wonjangcloud9/claude-tree`);

program.parse();

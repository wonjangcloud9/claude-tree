#!/usr/bin/env node

import { createRequire } from 'node:module';
import { program } from 'commander';
import { batchCommand } from './commands/batch.js';
import { bustercallCommand } from './commands/bustercall.js';
import { chainCommand } from './commands/chain.js';
import { cleanCommand } from './commands/clean.js';
import { doctorCommand } from './commands/doctor.js';
import { initCommand } from './commands/init.js';
import { listCommand } from './commands/list.js';
import { resumeCommand } from './commands/resume.js';
import { startCommand } from './commands/start.js';
import { statsCommand } from './commands/stats.js';
import { statusCommand } from './commands/status.js';
import { stopCommand } from './commands/stop.js';
import { webCommand } from './commands/web.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

program
  .name('claudetree')
  .description('Issue-to-PR automation: parallel Claude Code sessions with cost tracking & web dashboard')
  .version(version);

program.addCommand(batchCommand);
program.addCommand(bustercallCommand);
program.addCommand(chainCommand);
program.addCommand(cleanCommand);
program.addCommand(doctorCommand);
program.addCommand(initCommand);
program.addCommand(listCommand);
program.addCommand(resumeCommand);
program.addCommand(startCommand);
program.addCommand(statsCommand);
program.addCommand(statusCommand);
program.addCommand(stopCommand);
program.addCommand(webCommand);

program.parse();

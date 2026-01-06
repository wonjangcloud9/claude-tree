#!/usr/bin/env node

import { program } from 'commander';
import { batchCommand } from './commands/batch.js';
import { demoCommand } from './commands/demo.js';
import { doctorCommand } from './commands/doctor.js';
import { initCommand } from './commands/init.js';
import { listCommand } from './commands/list.js';
import { resumeCommand } from './commands/resume.js';
import { startCommand } from './commands/start.js';
import { statusCommand } from './commands/status.js';
import { stopCommand } from './commands/stop.js';
import { webCommand } from './commands/web.js';

program
  .name('claudetree')
  .description('Git Worktree-based Claude Code multi-session manager')
  .version('0.1.0');

program.addCommand(batchCommand);
program.addCommand(demoCommand);
program.addCommand(doctorCommand);
program.addCommand(initCommand);
program.addCommand(listCommand);
program.addCommand(resumeCommand);
program.addCommand(startCommand);
program.addCommand(statusCommand);
program.addCommand(stopCommand);
program.addCommand(webCommand);

program.parse();

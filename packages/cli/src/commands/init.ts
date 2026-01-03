import { Command } from 'commander';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const CONFIG_DIR = '.claudetree';
const CONFIG_FILE = 'config.json';

interface InitOptions {
  worktreeDir: string;
  force: boolean;
}

export const initCommand = new Command('init')
  .description('Initialize claudetree in current repository')
  .option('-d, --worktree-dir <dir>', 'Base directory for worktrees', '.worktrees')
  .option('-f, --force', 'Overwrite existing configuration', false)
  .action(async (options: InitOptions) => {
    const cwd = process.cwd();
    const configDir = join(cwd, CONFIG_DIR);
    const configPath = join(configDir, CONFIG_FILE);

    // Check if already initialized
    if (!options.force) {
      try {
        await access(configPath);
        console.error('claudetree is already initialized. Use --force to reinitialize.');
        process.exit(1);
      } catch {
        // Config doesn't exist, proceed
      }
    }

    // Create config directory
    await mkdir(configDir, { recursive: true });

    // Create default config
    const config = {
      version: '0.1.0',
      worktreeDir: options.worktreeDir,
      sessions: {},
    };

    await writeFile(configPath, JSON.stringify(config, null, 2));

    // Create worktree directory
    const worktreeDir = join(cwd, options.worktreeDir);
    await mkdir(worktreeDir, { recursive: true });

    // Add to gitignore
    const gitignorePath = join(cwd, '.gitignore');
    try {
      const gitignoreContent = await import('node:fs/promises')
        .then((fs) => fs.readFile(gitignorePath, 'utf-8'))
        .catch(() => '');

      if (!gitignoreContent.includes(CONFIG_DIR)) {
        const newContent = gitignoreContent + `\n# claudetree\n${CONFIG_DIR}/\n${options.worktreeDir}/\n`;
        await writeFile(gitignorePath, newContent);
      }
    } catch {
      // Ignore gitignore errors
    }

    console.log(`Initialized claudetree in ${cwd}`);
    console.log(`  Config: ${configPath}`);
    console.log(`  Worktrees: ${worktreeDir}`);
  });

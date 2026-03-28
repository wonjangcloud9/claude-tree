import { Command } from 'commander';
import { join } from 'node:path';
import { readFile, writeFile, access } from 'node:fs/promises';

const CONFIG_DIR = '.claudetree';
const CONFIG_FILE = 'config.json';

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';

async function loadConfig(cwd: string): Promise<Record<string, unknown>> {
  const configPath = join(cwd, CONFIG_DIR, CONFIG_FILE);
  try {
    await access(configPath);
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    console.error('Error: claudetree not initialized. Run "ct init" first.');
    process.exit(1);
  }
}

async function saveConfig(cwd: string, config: Record<string, unknown>): Promise<void> {
  const configPath = join(cwd, CONFIG_DIR, CONFIG_FILE);
  await writeFile(configPath, JSON.stringify(config, null, 2));
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  const lastKey = keys[keys.length - 1]!;
  current[lastKey] = value;
}

function formatValue(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (value === null || value === undefined) return `${DIM}null${RESET}`;
  if (typeof value === 'string') return `${GREEN}"${value}"${RESET}`;
  if (typeof value === 'number' || typeof value === 'boolean') return `${YELLOW}${value}${RESET}`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return `${DIM}{}${RESET}`;
    const lines = entries.map(([k, v]) => `${pad}  ${CYAN}${k}${RESET}: ${formatValue(v, indent + 1)}`);
    return `\n${lines.join('\n')}`;
  }
  return String(value);
}

export const configCommand = new Command('config')
  .description('View or modify claudetree configuration')
  .argument('[action]', 'Action: get, set, or omit to show all')
  .argument('[key]', 'Config key (dot notation: github.owner)')
  .argument('[value]', 'Value to set')
  .option('--json', 'Output as JSON', false)
  .action(async (action?: string, key?: string, value?: string, options?: { json: boolean }) => {
    const cwd = process.cwd();
    const config = await loadConfig(cwd);

    // ct config (no args) — show all
    if (!action) {
      if (options?.json) {
        console.log(JSON.stringify(config, null, 2));
      } else {
        console.log(`${CYAN}claudetree config${RESET} ${DIM}(${join(cwd, CONFIG_DIR, CONFIG_FILE)})${RESET}\n`);
        for (const [k, v] of Object.entries(config)) {
          console.log(`${CYAN}${k}${RESET}: ${formatValue(v)}`);
        }
      }
      return;
    }

    // ct config get <key>
    if (action === 'get') {
      if (!key) {
        console.error('Usage: ct config get <key>');
        process.exit(1);
      }
      const val = getNestedValue(config, key);
      if (val === undefined) {
        console.error(`Key "${key}" not found in config.`);
        process.exit(1);
      }
      if (options?.json) {
        console.log(JSON.stringify(val, null, 2));
      } else {
        console.log(formatValue(val));
      }
      return;
    }

    // ct config set <key> <value>
    if (action === 'set') {
      if (!key || value === undefined) {
        console.error('Usage: ct config set <key> <value>');
        process.exit(1);
      }
      // Try to parse as JSON, fall back to string
      let parsed: unknown = value;
      try {
        parsed = JSON.parse(value);
      } catch {
        // Keep as string
      }
      setNestedValue(config, key, parsed);
      await saveConfig(cwd, config);
      console.log(`${GREEN}Set${RESET} ${CYAN}${key}${RESET} = ${formatValue(parsed)}`);
      return;
    }

    // ct config <key> — shorthand for get
    const val = getNestedValue(config, action);
    if (val !== undefined) {
      if (options?.json) {
        console.log(JSON.stringify(val, null, 2));
      } else {
        console.log(formatValue(val));
      }
    } else {
      console.error(`Unknown action or key: "${action}". Use: ct config [get|set] <key> [value]`);
      process.exit(1);
    }
  });

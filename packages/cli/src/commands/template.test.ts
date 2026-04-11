import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('@claudetree/core', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@claudetree/core')>();
  return {
    ...orig,
    TemplateLoader: class {
      loadAll = vi.fn().mockResolvedValue({});
      load = vi.fn().mockResolvedValue(null);
    },
  };
});

import { templateCommand } from './template.js';

describe('templateCommand', () => {
  let testDir: string;
  let originalCwd: string;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-template-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    process.exit = vi.fn() as never;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    consoleLogSpy.mockRestore();
    vi.restoreAllMocks();
    await rm(testDir, { recursive: true, force: true });
  });

  it('should have correct command name', () => {
    expect(templateCommand.name()).toBe('template');
  });

  describe('list', () => {
    it('should list built-in templates', async () => {
      await templateCommand.parseAsync(['node', 'test', 'list']);

      const output = consoleLogSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
      expect(output).toContain('Built-in');
      expect(output).toContain('bugfix');
      expect(output).toContain('feature');
      expect(output).toContain('security');
      expect(output).toContain('migration');
      expect(output).toContain('performance');
    });
  });

  describe('create', () => {
    it('should create a custom template file', async () => {
      await mkdir(join(testDir, '.claudetree'), { recursive: true });

      await templateCommand.parseAsync([
        'node', 'test', 'create', 'my-template',
        '--description', 'My custom template',
        '--prompt', 'Do the thing',
      ]);

      const output = consoleLogSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
      expect(output).toContain('created');

      const content = await readFile(
        join(testDir, '.claudetree', 'templates', 'my-template.json'),
        'utf-8',
      );
      const tmpl = JSON.parse(content);
      expect(tmpl.name).toBe('my-template');
      expect(tmpl.description).toBe('My custom template');
    });
  });
});

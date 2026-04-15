import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { completionCommand } from './completion.js';

describe('completionCommand', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let originalExit: typeof process.exit;

  beforeEach(() => {
    originalExit = process.exit;
    process.exit = vi.fn() as never;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.exit = originalExit;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('should generate bash completion', async () => {
    await completionCommand.parseAsync(['node', 'test', 'bash']);

    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('_claudetree_completions');
    expect(output).toContain('complete -F');
  });

  it('should generate zsh completion', async () => {
    await completionCommand.parseAsync(['node', 'test', 'zsh']);

    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('#compdef');
    expect(output).toContain('compdef _claudetree');
  });

  it('should generate fish completion', async () => {
    await completionCommand.parseAsync(['node', 'test', 'fish']);

    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('complete -c claudetree');
  });

  it('should include all major commands in bash completion', async () => {
    await completionCommand.parseAsync(['node', 'test', 'bash']);

    const output = consoleLogSpy.mock.calls.flat().join('\n');
    for (const cmd of ['start', 'status', 'auto', 'inspect', 'cost', 'rerun', 'tag', 'cleanup', 'completion']) {
      expect(output).toContain(cmd);
    }
  });

  it('should include all major commands in zsh completion', async () => {
    await completionCommand.parseAsync(['node', 'test', 'zsh']);

    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('inspect:Detailed session information');
    expect(output).toContain('cost:Cost analytics');
    expect(output).toContain('cleanup:Smart cleanup');
  });
});

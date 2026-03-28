import { describe, it, expect } from 'vitest';
import { logCommand } from './log.js';

describe('logCommand', () => {
  it('should have correct command name', () => {
    expect(logCommand.name()).toBe('log');
  });

  it('should have a description', () => {
    expect(logCommand.description()).toContain('session events');
  });

  it('should require session argument', () => {
    const args = logCommand.registeredArguments;
    expect(args.length).toBe(1);
    expect(args[0]?.name()).toBe('session');
    expect(args[0]?.required).toBe(true);
  });

  it('should have --lines option with default 50', () => {
    const linesOpt = logCommand.options.find(
      (o) => o.long === '--lines',
    );
    expect(linesOpt).toBeDefined();
    expect(linesOpt?.defaultValue).toBe('50');
  });

  it('should have --type filter option', () => {
    const typeOpt = logCommand.options.find(
      (o) => o.long === '--type',
    );
    expect(typeOpt).toBeDefined();
  });

  it('should have --json option', () => {
    const jsonOpt = logCommand.options.find(
      (o) => o.long === '--json',
    );
    expect(jsonOpt).toBeDefined();
    expect(jsonOpt?.defaultValue).toBe(false);
  });

  it('should have --follow option', () => {
    const followOpt = logCommand.options.find(
      (o) => o.long === '--follow',
    );
    expect(followOpt).toBeDefined();
    expect(followOpt?.defaultValue).toBe(false);
  });

  it('should have action handler defined', () => {
    expect(
      (logCommand as unknown as { _actionHandler: unknown })._actionHandler,
    ).toBeDefined();
  });
});

import { describe, it, expect } from 'vitest';
import { configCommand } from './config.js';

describe('configCommand', () => {
  it('should have correct command name', () => {
    expect(configCommand.name()).toBe('config');
  });

  it('should have a description', () => {
    expect(configCommand.description()).toContain('configuration');
  });

  it('should accept optional action argument', () => {
    const args = configCommand.registeredArguments;
    expect(args.length).toBeGreaterThanOrEqual(1);
    expect(args[0]?.name()).toBe('action');
    expect(args[0]?.required).toBe(false);
  });

  it('should accept optional key argument', () => {
    const args = configCommand.registeredArguments;
    expect(args.length).toBeGreaterThanOrEqual(2);
    expect(args[1]?.name()).toBe('key');
    expect(args[1]?.required).toBe(false);
  });

  it('should accept optional value argument', () => {
    const args = configCommand.registeredArguments;
    expect(args.length).toBe(3);
    expect(args[2]?.name()).toBe('value');
    expect(args[2]?.required).toBe(false);
  });

  it('should have --json option', () => {
    const jsonOpt = configCommand.options.find(
      (o) => o.long === '--json',
    );
    expect(jsonOpt).toBeDefined();
    expect(jsonOpt?.defaultValue).toBe(false);
  });

  it('should have action handler defined', () => {
    expect(
      (configCommand as unknown as { _actionHandler: unknown })._actionHandler,
    ).toBeDefined();
  });
});

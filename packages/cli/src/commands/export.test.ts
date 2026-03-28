import { describe, it, expect } from 'vitest';
import { exportCommand } from './export.js';

describe('exportCommand', () => {
  it('should have correct command name', () => {
    expect(exportCommand.name()).toBe('export');
  });

  it('should have a description', () => {
    expect(exportCommand.description()).toContain('report');
  });

  it('should have --format option with default markdown', () => {
    const opt = exportCommand.options.find((o) => o.long === '--format');
    expect(opt).toBeDefined();
    expect(opt?.defaultValue).toBe('markdown');
  });

  it('should have --output option', () => {
    const opt = exportCommand.options.find((o) => o.long === '--output');
    expect(opt).toBeDefined();
  });

  it('should have --status filter option', () => {
    const opt = exportCommand.options.find((o) => o.long === '--status');
    expect(opt).toBeDefined();
  });

  it('should have action handler defined', () => {
    expect(
      (exportCommand as unknown as { _actionHandler: unknown })._actionHandler,
    ).toBeDefined();
  });
});

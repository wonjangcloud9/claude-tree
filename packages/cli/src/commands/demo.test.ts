import { describe, it, expect } from 'vitest';
import { demoCommand } from './demo.js';

describe('demoCommand', () => {
  describe('command structure', () => {
    it('should have correct name', () => {
      expect(demoCommand.name()).toBe('demo');
    });

    it('should have correct description', () => {
      expect(demoCommand.description()).toContain('Interactive demo');
      expect(demoCommand.description()).toContain('no tokens');
    });

    it('should not require arguments', () => {
      // Demo command has no required arguments
      const args = demoCommand.registeredArguments;
      expect(args).toHaveLength(0);
    });

    it('should not have options', () => {
      // Demo command has no options
      const options = demoCommand.options;
      expect(options).toHaveLength(0);
    });
  });

  describe('command definition', () => {
    it('should be a Command instance', () => {
      expect(demoCommand).toBeDefined();
      expect(typeof demoCommand.parseAsync).toBe('function');
    });

    it('should have action handler', () => {
      // Commander stores action in _actionHandler
      expect((demoCommand as unknown as { _actionHandler: unknown })._actionHandler).toBeDefined();
    });
  });
});

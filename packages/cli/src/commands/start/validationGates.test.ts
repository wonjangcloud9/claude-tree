import { describe, it, expect } from 'vitest';
import { parseGates } from './validationGates.js';

describe('validationGates', () => {
  describe('parseGates', () => {
    it('should always include install gate first', () => {
      const gates = parseGates('test');

      expect(gates[0]).toEqual({
        name: 'install',
        command: 'pnpm install --frozen-lockfile',
        required: true,
      });
    });

    it('should parse test gate', () => {
      const gates = parseGates('test');
      const testGate = gates.find((g) => g.name === 'test');

      expect(testGate).toBeDefined();
      expect(testGate?.command).toBe('pnpm test:run');
      expect(testGate?.required).toBe(true);
    });

    it('should use custom test command', () => {
      const gates = parseGates('test', 'npm run test:ci');
      const testGate = gates.find((g) => g.name === 'test');

      expect(testGate?.command).toBe('npm run test:ci');
    });

    it('should parse type gate', () => {
      const gates = parseGates('type');
      const typeGate = gates.find((g) => g.name === 'type');

      expect(typeGate).toBeDefined();
      expect(typeGate?.command).toBe('pnpm -r exec tsc --noEmit');
      expect(typeGate?.required).toBe(true);
    });

    it('should parse lint gate as optional', () => {
      const gates = parseGates('lint');
      const lintGate = gates.find((g) => g.name === 'lint');

      expect(lintGate).toBeDefined();
      expect(lintGate?.command).toBe('pnpm lint');
      expect(lintGate?.required).toBe(false);
    });

    it('should parse build gate as optional', () => {
      const gates = parseGates('build');
      const buildGate = gates.find((g) => g.name === 'build');

      expect(buildGate).toBeDefined();
      expect(buildGate?.command).toBe('pnpm build');
      expect(buildGate?.required).toBe(false);
    });

    it('should parse multiple gates', () => {
      const gates = parseGates('test,type,lint');

      expect(gates).toHaveLength(4); // install + test + type + lint
      expect(gates.map((g) => g.name)).toEqual(['install', 'test', 'type', 'lint']);
    });

    it('should handle whitespace in gate string', () => {
      const gates = parseGates('test , type , lint');

      expect(gates.map((g) => g.name)).toEqual(['install', 'test', 'type', 'lint']);
    });

    it('should ignore unknown gates', () => {
      const gates = parseGates('test,unknown,type');

      expect(gates).toHaveLength(3); // install + test + type
      expect(gates.map((g) => g.name)).toEqual(['install', 'test', 'type']);
    });

    it('should handle case insensitivity', () => {
      const gates = parseGates('TEST,Type,LINT');

      expect(gates.map((g) => g.name)).toEqual(['install', 'test', 'type', 'lint']);
    });
  });
});

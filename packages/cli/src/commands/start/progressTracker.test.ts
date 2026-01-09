import { describe, it, expect } from 'vitest';
import {
  parseToolCall,
  detectProgressStep,
  updateProgress,
} from './progressTracker.js';
import type { SessionProgress } from '@claudetree/shared';

describe('progressTracker', () => {
  describe('parseToolCall', () => {
    it('should parse valid tool call', () => {
      const content = 'Bash: {"command": "npm test"}';
      const result = parseToolCall(content);

      expect(result).not.toBeNull();
      expect(result?.toolName).toBe('Bash');
      expect(result?.parameters).toEqual({ command: 'npm test' });
    });

    it('should handle complex parameters', () => {
      const content = 'Edit: {"file_path": "/test.ts", "old_string": "a", "new_string": "b"}';
      const result = parseToolCall(content);

      expect(result?.toolName).toBe('Edit');
      expect(result?.parameters).toHaveProperty('file_path', '/test.ts');
    });

    it('should return null for invalid format', () => {
      expect(parseToolCall('invalid')).toBeNull();
      expect(parseToolCall('')).toBeNull();
      expect(parseToolCall('NoColon')).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const content = 'Bash: {not valid json}';
      expect(parseToolCall(content)).toBeNull();
    });
  });

  describe('detectProgressStep', () => {
    it('should detect testing step', () => {
      expect(detectProgressStep('Bash', { command: 'npm test' })).toBe('testing');
      expect(detectProgressStep('Bash', { command: 'vitest run' })).toBe('testing');
      expect(detectProgressStep('Bash', { command: 'jest' })).toBe('testing');
      expect(detectProgressStep('Bash', { command: 'pytest' })).toBe('testing');
    });

    it('should detect committing step', () => {
      expect(detectProgressStep('Bash', { command: 'git commit -m "feat: add"' })).toBe('committing');
    });

    it('should detect creating_pr step', () => {
      expect(detectProgressStep('Bash', { command: 'gh pr create' })).toBe('creating_pr');
      expect(detectProgressStep('Bash', { command: 'git push origin' })).toBe('creating_pr');
    });

    it('should detect implementing step', () => {
      expect(detectProgressStep('Edit', { file_path: '/test.ts' })).toBe('implementing');
      expect(detectProgressStep('Write', { file_path: '/new.ts' })).toBe('implementing');
    });

    it('should detect analyzing step', () => {
      expect(detectProgressStep('Read', { file_path: '/test.ts' })).toBe('analyzing');
      expect(detectProgressStep('Glob', { pattern: '**/*.ts' })).toBe('analyzing');
      expect(detectProgressStep('Grep', { pattern: 'function' })).toBe('analyzing');
    });

    it('should return null for unknown tools', () => {
      expect(detectProgressStep('Unknown', {})).toBeNull();
      expect(detectProgressStep('Bash', { command: 'echo hello' })).toBeNull();
    });
  });

  describe('updateProgress', () => {
    it('should advance to next step', () => {
      const progress: SessionProgress = {
        currentStep: 'analyzing',
        completedSteps: [],
        startedAt: new Date(),
      };

      const updated = updateProgress(progress, 'implementing');

      expect(updated.currentStep).toBe('implementing');
      expect(updated.completedSteps).toContain('analyzing');
    });

    it('should not regress to earlier step', () => {
      const progress: SessionProgress = {
        currentStep: 'testing',
        completedSteps: ['analyzing', 'implementing'],
        startedAt: new Date(),
      };

      const updated = updateProgress(progress, 'analyzing');

      expect(updated.currentStep).toBe('testing');
      expect(updated.completedSteps).toEqual(['analyzing', 'implementing']);
    });

    it('should mark current step as completed when advancing to later step', () => {
      const progress: SessionProgress = {
        currentStep: 'analyzing',
        completedSteps: [],
        startedAt: new Date(),
      };

      const updated = updateProgress(progress, 'testing');

      expect(updated.currentStep).toBe('testing');
      // Only marks current step (analyzing) as completed
      expect(updated.completedSteps).toContain('analyzing');
    });

    it('should preserve other progress properties', () => {
      const startedAt = new Date('2024-01-01');
      const progress: SessionProgress = {
        currentStep: 'analyzing',
        completedSteps: [],
        startedAt,
      };

      const updated = updateProgress(progress, 'implementing');

      expect(updated.startedAt).toBe(startedAt);
    });
  });
});

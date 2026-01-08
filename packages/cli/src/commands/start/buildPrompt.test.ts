import { describe, it, expect } from 'vitest';
import { buildPrompt, buildSystemPrompt, formatDuration } from './buildPrompt.js';
import type { Issue, SessionTemplate, TDDConfig } from '@claudetree/shared';

describe('buildPrompt', () => {
  describe('with issue data', () => {
    it('should build prompt from issue data', () => {
      const issueData: Issue = {
        number: 42,
        title: 'Add feature X',
        body: 'We need to implement feature X',
        labels: ['enhancement'],
        state: 'open',
        url: 'https://github.com/owner/repo/issues/42',
      };

      const result = buildPrompt({
        issueNumber: 42,
        issueData,
        branchName: 'issue-42-add-feature-x',
        taskDescription: null,
        tddEnabled: false,
      });

      expect(result).toContain('Issue #42');
      expect(result).toContain('Add feature X');
      expect(result).toContain('We need to implement feature X');
      expect(result).toContain('IMPLEMENT the solution');
    });

    it('should add TDD instruction when enabled', () => {
      const issueData: Issue = {
        number: 42,
        title: 'Add feature X',
        body: 'Implement feature',
        labels: [],
        state: 'open',
        url: '',
      };

      const result = buildPrompt({
        issueNumber: 42,
        issueData,
        branchName: 'issue-42',
        taskDescription: null,
        tddEnabled: true,
      });

      expect(result).toContain('TDD');
      expect(result).toContain('failing test');
    });
  });

  describe('with issue number only', () => {
    it('should build simple prompt with issue number', () => {
      const result = buildPrompt({
        issueNumber: 42,
        issueData: null,
        branchName: 'issue-42',
        taskDescription: null,
        tddEnabled: false,
      });

      expect(result).toContain('#42');
      expect(result).toContain('Implement');
    });
  });

  describe('with task description', () => {
    it('should build prompt from task description', () => {
      const result = buildPrompt({
        issueNumber: null,
        issueData: null,
        branchName: 'task-add-auth',
        taskDescription: 'add user authentication',
        tddEnabled: false,
      });

      expect(result).toContain('add user authentication');
      expect(result).toContain('IMPLEMENT');
    });
  });

  describe('with template', () => {
    it('should apply template prefix and suffix', () => {
      const template: SessionTemplate = {
        name: 'bugfix',
        description: 'Bug fix template',
        promptPrefix: 'DEBUG MODE:',
        promptSuffix: 'Run tests after fix.',
      };

      const result = buildPrompt({
        issueNumber: 1,
        issueData: null,
        branchName: 'issue-1',
        taskDescription: null,
        tddEnabled: false,
        template,
      });

      expect(result).toMatch(/^DEBUG MODE:/);
      expect(result).toMatch(/Run tests after fix\.$/);
    });
  });

  describe('with custom prompt', () => {
    it('should use custom prompt when provided', () => {
      const result = buildPrompt({
        issueNumber: 42,
        issueData: null,
        branchName: 'issue-42',
        taskDescription: null,
        tddEnabled: false,
        customPrompt: 'Custom instruction here',
      });

      expect(result).toBe('Custom instruction here');
    });
  });
});

describe('buildSystemPrompt', () => {
  describe('TDD mode', () => {
    it('should build TDD system prompt with gates', () => {
      const tddConfig: TDDConfig = {
        timeout: 7200000, // 2h
        idleTimeout: 600000, // 10m
        maxIterations: 10,
        maxRetries: 3,
        gates: [
          { name: 'test', command: 'pnpm test', required: true },
          { name: 'type', command: 'tsc --noEmit', required: true },
        ],
      };

      const result = buildSystemPrompt({
        tddEnabled: true,
        tddConfig,
      });

      expect(result).toContain('TDD');
      expect(result).toContain('RED Phase');
      expect(result).toContain('GREEN Phase');
      expect(result).toContain('REFACTOR');
      expect(result).toContain('pnpm test');
      expect(result).toContain('tsc --noEmit');
    });
  });

  describe('review skill', () => {
    it('should build review system prompt', () => {
      const result = buildSystemPrompt({
        tddEnabled: false,
        skill: 'review',
      });

      expect(result).toContain('Review');
      expect(result).toContain('security');
    });
  });

  describe('docs skill', () => {
    it('should build docs system prompt', () => {
      const result = buildSystemPrompt({
        tddEnabled: false,
        skill: 'docs',
      });

      expect(result).toContain('documentation');
      expect(result).toContain('README');
    });
  });

  describe('template system prompt', () => {
    it('should use template system prompt when provided', () => {
      const template: SessionTemplate = {
        name: 'custom',
        description: 'Custom template',
        systemPrompt: 'Custom system instructions',
      };

      const result = buildSystemPrompt({
        tddEnabled: false,
        template,
      });

      expect(result).toBe('Custom system instructions');
    });
  });
});

describe('formatDuration', () => {
  it('should format seconds', () => {
    expect(formatDuration(5000)).toBe('5s');
    expect(formatDuration(45000)).toBe('45s');
  });

  it('should format minutes and seconds', () => {
    expect(formatDuration(60000)).toBe('1m 0s');
    expect(formatDuration(90000)).toBe('1m 30s');
    expect(formatDuration(125000)).toBe('2m 5s');
  });

  it('should format hours and minutes', () => {
    expect(formatDuration(3600000)).toBe('1h 0m');
    expect(formatDuration(5400000)).toBe('1h 30m');
    expect(formatDuration(7320000)).toBe('2h 2m');
  });
});

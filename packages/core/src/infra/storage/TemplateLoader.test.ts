import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TemplateLoader, DEFAULT_TEMPLATES } from './TemplateLoader.js';
import type { SessionTemplate } from '@claudetree/shared';

describe('TemplateLoader', () => {
  let testDir: string;
  let templatesDir: string;
  let loader: TemplateLoader;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'claudetree-template-test-'));
    templatesDir = join(testDir, 'templates');
    await mkdir(templatesDir, { recursive: true });
    loader = new TemplateLoader(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  const createTemplateFile = async (
    name: string,
    template: SessionTemplate
  ): Promise<void> => {
    const filePath = join(templatesDir, `${name}.json`);
    await writeFile(filePath, JSON.stringify(template), 'utf-8');
  };

  describe('load', () => {
    it('should load a template file', async () => {
      const template: SessionTemplate = {
        name: 'Test Template',
        description: 'A test template',
        promptPrefix: 'Test prefix',
      };
      await createTemplateFile('test', template);

      const loaded = await loader.load('test');

      expect(loaded).not.toBeNull();
      expect(loaded?.name).toBe('Test Template');
      expect(loaded?.description).toBe('A test template');
      expect(loaded?.promptPrefix).toBe('Test prefix');
    });

    it('should use filename as name if template has no name', async () => {
      const template = {
        description: 'No name template',
      } as SessionTemplate;
      await createTemplateFile('custom', template);

      const loaded = await loader.load('custom');

      expect(loaded).not.toBeNull();
      expect(loaded?.name).toBe('custom');
    });

    it('should return null for non-existent template', async () => {
      const loaded = await loader.load('non-existent');
      expect(loaded).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      const filePath = join(templatesDir, 'invalid.json');
      await writeFile(filePath, 'not valid json', 'utf-8');

      const loaded = await loader.load('invalid');
      expect(loaded).toBeNull();
    });

    it('should load template with all optional fields', async () => {
      const template: SessionTemplate = {
        name: 'Full Template',
        description: 'Complete template',
        promptPrefix: 'Prefix',
        promptSuffix: 'Suffix',
        systemPrompt: 'System prompt',
        skill: 'tdd',
        allowedTools: ['Read', 'Write'],
      };
      await createTemplateFile('full', template);

      const loaded = await loader.load('full');

      expect(loaded).toEqual(template);
    });
  });

  describe('list', () => {
    it('should list all template names', async () => {
      await createTemplateFile('template1', { name: 'T1' });
      await createTemplateFile('template2', { name: 'T2' });
      await createTemplateFile('template3', { name: 'T3' });

      const names = await loader.list();

      expect(names).toHaveLength(3);
      expect(names).toContain('template1');
      expect(names).toContain('template2');
      expect(names).toContain('template3');
    });

    it('should return empty array when no templates exist', async () => {
      await rm(templatesDir, { recursive: true, force: true });

      const names = await loader.list();

      expect(names).toEqual([]);
    });

    it('should only list .json files', async () => {
      await createTemplateFile('valid', { name: 'Valid' });
      await writeFile(join(templatesDir, 'readme.txt'), 'readme');
      await writeFile(join(templatesDir, 'config.yaml'), 'config');

      const names = await loader.list();

      expect(names).toHaveLength(1);
      expect(names).toContain('valid');
    });

    it('should return empty array when templates directory does not exist', async () => {
      const loaderWithMissingDir = new TemplateLoader('/nonexistent/path');

      const names = await loaderWithMissingDir.list();

      expect(names).toEqual([]);
    });
  });

  describe('loadAll', () => {
    it('should load all templates as record', async () => {
      await createTemplateFile('bugfix', { name: 'Bug Fix', skill: 'tdd' });
      await createTemplateFile('feature', { name: 'Feature' });

      const templates = await loader.loadAll();

      expect(Object.keys(templates)).toHaveLength(2);
      expect(templates['bugfix']?.name).toBe('Bug Fix');
      expect(templates['bugfix']?.skill).toBe('tdd');
      expect(templates['feature']?.name).toBe('Feature');
    });

    it('should return empty object when no templates', async () => {
      await rm(templatesDir, { recursive: true, force: true });

      const templates = await loader.loadAll();

      expect(templates).toEqual({});
    });

    it('should skip templates that fail to load', async () => {
      await createTemplateFile('valid', { name: 'Valid Template' });
      await writeFile(join(templatesDir, 'broken.json'), 'not json');

      const templates = await loader.loadAll();

      expect(Object.keys(templates)).toHaveLength(1);
      expect(templates['valid']?.name).toBe('Valid Template');
    });
  });

  describe('DEFAULT_TEMPLATES', () => {
    it('should have bugfix template with tdd skill', () => {
      expect(DEFAULT_TEMPLATES['bugfix']).toBeDefined();
      expect(DEFAULT_TEMPLATES['bugfix'].name).toBe('Bug Fix');
      expect(DEFAULT_TEMPLATES['bugfix'].skill).toBe('tdd');
    });

    it('should have feature template', () => {
      expect(DEFAULT_TEMPLATES['feature']).toBeDefined();
      expect(DEFAULT_TEMPLATES['feature'].name).toBe('Feature');
    });

    it('should have refactor template', () => {
      expect(DEFAULT_TEMPLATES['refactor']).toBeDefined();
      expect(DEFAULT_TEMPLATES['refactor'].name).toBe('Refactor');
    });

    it('should have review template with review skill', () => {
      expect(DEFAULT_TEMPLATES['review']).toBeDefined();
      expect(DEFAULT_TEMPLATES['review'].name).toBe('Code Review');
      expect(DEFAULT_TEMPLATES['review'].skill).toBe('review');
    });

    it('should have all required fields in templates', () => {
      for (const [key, template] of Object.entries(DEFAULT_TEMPLATES)) {
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.promptPrefix).toBeDefined();
        expect(typeof template.name).toBe('string');
        expect(typeof template.description).toBe('string');
        expect(typeof template.promptPrefix).toBe('string');
      }
    });
  });
});

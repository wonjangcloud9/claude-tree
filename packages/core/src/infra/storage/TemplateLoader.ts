import { readFile, readdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import type { SessionTemplate } from '@claudetree/shared';

const TEMPLATES_DIR = 'templates';

export class TemplateLoader {
  private readonly templatesPath: string;

  constructor(configDir: string) {
    this.templatesPath = join(configDir, TEMPLATES_DIR);
  }

  async load(name: string): Promise<SessionTemplate | null> {
    const filePath = join(this.templatesPath, `${name}.json`);

    try {
      const content = await readFile(filePath, 'utf-8');
      const template = JSON.parse(content) as SessionTemplate;
      return { ...template, name: template.name || name };
    } catch {
      return null;
    }
  }

  async list(): Promise<string[]> {
    try {
      const files = await readdir(this.templatesPath);
      return files
        .filter((f) => f.endsWith('.json'))
        .map((f) => basename(f, '.json'));
    } catch {
      return [];
    }
  }

  async loadAll(): Promise<Record<string, SessionTemplate>> {
    const names = await this.list();
    const templates: Record<string, SessionTemplate> = {};

    for (const name of names) {
      const template = await this.load(name);
      if (template) {
        templates[name] = template;
      }
    }

    return templates;
  }
}

export const DEFAULT_TEMPLATES: Record<string, SessionTemplate> = {
  bugfix: {
    name: 'Bug Fix',
    description: 'Fix bugs with minimal changes, test-first approach',
    promptPrefix: `You are fixing a bug. Follow these steps strictly:
1. First, write a failing test that reproduces the bug
2. Make the minimal code change to fix it
3. Verify all tests pass
4. Do NOT refactor or improve unrelated code`,
    skill: 'tdd',
  },
  feature: {
    name: 'Feature',
    description: 'Implement new features with proper testing',
    promptPrefix: `You are implementing a new feature. Follow these steps:
1. Understand the requirements fully
2. Design the solution before coding
3. Implement with tests
4. Document any new public APIs`,
  },
  refactor: {
    name: 'Refactor',
    description: 'Improve code structure without changing behavior',
    promptPrefix: `You are refactoring code. Important rules:
1. Do NOT change any external behavior
2. Ensure all existing tests still pass
3. Add tests if coverage is low
4. Make small, incremental changes
5. Each commit should be a working state`,
  },
  review: {
    name: 'Code Review',
    description: 'Review code for issues and improvements',
    promptPrefix: `You are reviewing code. Check for:
1. Security vulnerabilities
2. Performance issues
3. Code style and best practices
4. Missing error handling
5. Test coverage gaps`,
    skill: 'review',
  },
  docs: {
    name: 'Documentation',
    description: 'Auto-generate README and API documentation from code analysis',
    promptPrefix: `You are generating documentation. Follow these steps:
1. Analyze the codebase structure and key components
2. Identify public APIs, configuration options, and usage patterns
3. Generate clear, comprehensive documentation
4. Include code examples where helpful
5. Use proper Markdown formatting`,
    skill: 'docs',
    allowedTools: ['Read', 'Glob', 'Grep', 'Write'],
  },
  security: {
    name: 'Security Audit',
    description: 'Scan code for security vulnerabilities and fix them',
    promptPrefix: `You are performing a security audit. Check for:
1. OWASP Top 10 vulnerabilities (injection, XSS, CSRF, etc.)
2. Hardcoded secrets, API keys, or credentials
3. Insecure dependencies (check package.json)
4. Missing input validation at system boundaries
5. Improper error handling that leaks internal details
6. Authentication/authorization flaws
7. Insecure data storage or transmission

For each issue found:
- Classify severity (critical/high/medium/low)
- Explain the attack vector
- Provide the fix with code
- Add a test to prevent regression`,
  },
  migration: {
    name: 'Migration',
    description: 'Safely migrate code, dependencies, or data schemas',
    promptPrefix: `You are performing a migration. Follow these rules strictly:
1. NEVER make breaking changes without a migration path
2. Create rollback plan before starting
3. Migrate incrementally - one step at a time
4. Ensure backward compatibility during transition
5. Update all affected tests after each step
6. Document what changed and why in commit messages

If migrating dependencies:
- Check changelogs for breaking changes
- Update imports and API calls
- Run full test suite after each change

If migrating data/schemas:
- Write up/down migration scripts
- Test with sample data before applying
- Keep old schema support during transition period`,
  },
  performance: {
    name: 'Performance',
    description: 'Profile, identify bottlenecks, and optimize code',
    promptPrefix: `You are optimizing performance. Follow this approach:
1. MEASURE first - identify the actual bottleneck
2. Profile before changing anything
3. Focus on the hottest path (80/20 rule)
4. Make ONE change at a time
5. Benchmark after each change to verify improvement
6. Never sacrifice correctness for speed

Common optimizations to check:
- N+1 queries or redundant API calls
- Missing indexes on frequently queried fields
- Unnecessary re-renders in UI components
- Large bundle size / unused imports
- Synchronous operations that could be async
- Missing caching for expensive computations

Always include before/after metrics in commit messages.`,
  },
};

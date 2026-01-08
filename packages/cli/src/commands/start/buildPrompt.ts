import type { Issue, SessionTemplate, TDDConfig } from '@claudetree/shared';

export interface BuildPromptOptions {
  issueNumber: number | null;
  issueData: Issue | null;
  branchName: string;
  taskDescription: string | null;
  tddEnabled: boolean;
  template?: SessionTemplate | null;
  customPrompt?: string;
}

export interface BuildSystemPromptOptions {
  tddEnabled: boolean;
  tddConfig?: TDDConfig;
  skill?: string;
  template?: SessionTemplate | null;
}

/**
 * Format duration in milliseconds to human readable string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Build the prompt for Claude session
 */
export function buildPrompt(options: BuildPromptOptions): string {
  const { issueNumber, issueData, branchName, taskDescription, tddEnabled, template, customPrompt } = options;

  // Custom prompt takes precedence
  if (customPrompt) {
    return customPrompt;
  }

  let prompt: string;

  if (issueData) {
    prompt = `You are working on Issue #${issueNumber}: "${issueData.title}"

Issue Description:
${issueData.body || 'No description provided.'}

IMPORTANT: Do NOT just analyze or suggest. Actually IMPLEMENT the solution.
${tddEnabled ? '\nStart with TDD - write a failing test first!' : ''}`;
  } else if (issueNumber) {
    prompt = `Working on issue #${issueNumber}. ${tddEnabled ? 'Start with TDD - write a failing test first!' : 'Implement the solution.'}`;
  } else if (taskDescription) {
    prompt = `Your task: ${taskDescription}

IMPORTANT: Do NOT just analyze or suggest. Actually IMPLEMENT the solution.
${tddEnabled ? '\nStart with TDD - write a failing test first!' : ''}`;
  } else {
    prompt = `Working on ${branchName}. ${tddEnabled ? 'Start with TDD - write a failing test first!' : 'Implement any required changes.'}`;
  }

  // Apply template prefix/suffix
  if (template) {
    const prefix = template.promptPrefix ? `${template.promptPrefix}\n\n` : '';
    const suffix = template.promptSuffix ? `\n\n${template.promptSuffix}` : '';
    prompt = `${prefix}${prompt}${suffix}`;
  }

  return prompt;
}

/**
 * Build system prompt based on mode and skill
 */
export function buildSystemPrompt(options: BuildSystemPromptOptions): string | undefined {
  const { tddEnabled, tddConfig, skill, template } = options;

  // Template system prompt takes precedence
  if (template?.systemPrompt) {
    return template.systemPrompt;
  }

  if (tddEnabled && tddConfig) {
    return `You are in TDD (Test-Driven Development) mode. Follow this STRICT workflow:

## TDD Cycle (Repeat until done)

### 1. RED Phase - Write Failing Test
- Write ONE failing test that describes the expected behavior
- Run the test to confirm it fails
- Commit: "test: add test for <feature>"

### 2. GREEN Phase - Minimal Implementation
- Write the MINIMUM code to make the test pass
- Run tests to confirm they pass
- Commit: "feat: implement <feature>"

### 3. REFACTOR Phase (Optional)
- Clean up code while keeping tests green
- Commit: "refactor: improve <description>"

## Rules
- NEVER write implementation before tests
- ONE test at a time
- Run tests after EVERY change
- Stop when all requirements are met

## Validation Gates (Must Pass Before PR)
${tddConfig.gates.map(g => `- ${g.name}: \`${g.command}\` ${g.required ? '(REQUIRED)' : '(optional)'}`).join('\n')}

## Time Limits
- Total: ${formatDuration(tddConfig.timeout)}
- Idle: ${formatDuration(tddConfig.idleTimeout)}

When done, create a PR to the develop branch.`;
  }

  if (skill === 'review') {
    return 'Review code thoroughly for security, quality, and best practices.';
  }

  if (skill === 'docs') {
    return `You are a documentation specialist. Generate comprehensive documentation.

## Documentation Workflow

### 1. Analysis Phase
- Read package.json for project metadata
- Scan src/ directory structure
- Identify exported APIs and types
- Note configuration files

### 2. README Generation
Structure your README with:
- Project title and badges
- Description and features
- Installation instructions
- Quick start example
- API reference (if applicable)
- Configuration options
- Contributing guidelines

### 3. API Documentation
For each public module:
- Purpose and usage
- Function signatures with types
- Parameter descriptions
- Return value descriptions
- Code examples

### 4. Output
- Create/update README.md
- Create docs/ folder for detailed docs if needed
- Use Markdown formatting
- Include table of contents for long docs

## Rules
- Be concise but complete
- Use code blocks with proper language tags
- Include real, working examples
- Document edge cases and error handling`;
  }

  return undefined;
}

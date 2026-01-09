'use client';

import { CodeBlock } from './CodeBlock';
import {
  sectionContainer,
  pageTitle,
  sectionTitle,
  subSectionTitle,
  paragraph,
  inlineCode,
} from './docsStyles';

export function SessionTemplatesSection() {
  return (
    <section id="session-templates" style={sectionContainer}>
      <h1 style={pageTitle}>Session Templates</h1>
      <p style={paragraph}>
        Templates define reusable configurations for Claude sessions, including prompts and
        behaviors.
      </p>

      <h2 id="built-in-templates" style={sectionTitle}>
        Built-in Templates
      </h2>

      <h3 style={subSectionTitle}>bugfix</h3>
      <p style={paragraph}>For bug fixes with TDD approach.</p>
      <CodeBlock
        code={`{
  "name": "Bug Fix",
  "description": "Fix bugs using Test-Driven Development",
  "skill": "tdd",
  "promptPrefix": "You are fixing a bug. Follow TDD: write a failing test first.",
  "promptSuffix": "Ensure all tests pass before committing."
}`}
        language="json"
        filename="templates/bugfix.json"
      />

      <h3 style={subSectionTitle}>feature</h3>
      <p style={paragraph}>For implementing new features.</p>
      <CodeBlock
        code={`{
  "name": "Feature",
  "description": "Implement new features",
  "promptPrefix": "You are implementing a new feature.",
  "promptSuffix": "Write tests and documentation for new functionality."
}`}
        language="json"
        filename="templates/feature.json"
      />

      <h3 style={subSectionTitle}>refactor</h3>
      <p style={paragraph}>For code refactoring without behavior changes.</p>
      <CodeBlock
        code={`{
  "name": "Refactor",
  "description": "Refactor code without changing behavior",
  "promptPrefix": "You are refactoring code. Do not change external behavior.",
  "promptSuffix": "Verify all existing tests still pass."
}`}
        language="json"
        filename="templates/refactor.json"
      />

      <h3 style={subSectionTitle}>review</h3>
      <p style={paragraph}>For code review mode.</p>
      <CodeBlock
        code={`{
  "name": "Code Review",
  "description": "Review code for quality and security",
  "skill": "review",
  "systemPrompt": "Review code thoroughly for security, quality, and best practices."
}`}
        language="json"
        filename="templates/review.json"
      />

      <h2 id="custom-templates" style={sectionTitle}>
        Custom Templates
      </h2>
      <p style={paragraph}>
        Create custom templates in <code style={inlineCode}>.claudetree/templates/</code>.
      </p>
      <CodeBlock
        code={`{
  "name": "API Endpoint",
  "description": "Create new REST API endpoint",
  "promptPrefix": "You are creating a new REST API endpoint.",
  "promptSuffix": "Include: route, controller, service, validation, tests, OpenAPI docs.",
  "systemPrompt": "Follow REST best practices. Use proper HTTP status codes.",
  "allowedTools": ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
}`}
        language="json"
        filename="templates/api-endpoint.json"
      />

      <h3 style={subSectionTitle}>Usage</h3>
      <CodeBlock
        code={`# Use custom template
ct start 42 --template api-endpoint`}
        language="bash"
      />

      <h2 id="template-schema" style={sectionTitle}>
        Template Schema
      </h2>
      <CodeBlock
        code={`interface SessionTemplate {
  name: string;              // Display name
  description?: string;      // Template description
  promptPrefix?: string;     // Prepended to issue prompt
  promptSuffix?: string;     // Appended to issue prompt
  systemPrompt?: string;     // Claude system prompt override
  skill?: 'tdd' | 'review';  // Pre-defined skill mode
  allowedTools?: string[];   // Restrict available tools
}`}
        language="typescript"
        filename="types/template.ts"
      />
    </section>
  );
}

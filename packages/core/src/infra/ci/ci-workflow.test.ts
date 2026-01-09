import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

interface WorkflowStep {
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
}

interface WorkflowJob {
  'runs-on': string;
  steps: WorkflowStep[];
}

interface Workflow {
  name: string;
  on: {
    push?: { branches: string[] };
    pull_request?: { branches: string[] };
  };
  jobs: Record<string, WorkflowJob>;
}

describe('CI Workflow Configuration', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // Navigate from packages/core/src/infra/ci to root
  const rootDir = join(__dirname, '..', '..', '..', '..', '..');
  const workflowPath = join(rootDir, '.github', 'workflows', 'ci.yml');

  async function loadWorkflow(): Promise<Workflow> {
    const content = await readFile(workflowPath, 'utf-8');
    return parse(content) as Workflow;
  }

  describe('triggers', () => {
    it('should trigger on push to main and develop branches', async () => {
      const workflow = await loadWorkflow();

      expect(workflow.on.push?.branches).toContain('main');
      expect(workflow.on.push?.branches).toContain('develop');
    });

    it('should trigger on pull_request to main and develop branches', async () => {
      const workflow = await loadWorkflow();

      expect(workflow.on.pull_request?.branches).toContain('main');
      expect(workflow.on.pull_request?.branches).toContain('develop');
    });
  });

  describe('test job', () => {
    it('should run on ubuntu-latest', async () => {
      const workflow = await loadWorkflow();

      expect(workflow.jobs.test?.['runs-on']).toBe('ubuntu-latest');
    });

    it('should checkout code', async () => {
      const workflow = await loadWorkflow();
      const steps = workflow.jobs.test?.steps ?? [];

      const checkoutStep = steps.find((s) => s.uses?.startsWith('actions/checkout'));
      expect(checkoutStep).toBeDefined();
    });

    it('should setup pnpm', async () => {
      const workflow = await loadWorkflow();
      const steps = workflow.jobs.test?.steps ?? [];

      const pnpmStep = steps.find((s) => s.uses?.startsWith('pnpm/action-setup'));
      expect(pnpmStep).toBeDefined();
    });

    it('should setup Node.js with version 22', async () => {
      const workflow = await loadWorkflow();
      const steps = workflow.jobs.test?.steps ?? [];

      const nodeStep = steps.find((s) => s.uses?.startsWith('actions/setup-node'));
      expect(nodeStep).toBeDefined();
      expect(nodeStep?.with?.['node-version']).toBe(22);
    });

    it('should install dependencies with frozen lockfile', async () => {
      const workflow = await loadWorkflow();
      const steps = workflow.jobs.test?.steps ?? [];

      const installStep = steps.find(
        (s) => s.run?.includes('pnpm install') && s.run?.includes('--frozen-lockfile')
      );
      expect(installStep).toBeDefined();
    });

    it('should run lint', async () => {
      const workflow = await loadWorkflow();
      const steps = workflow.jobs.test?.steps ?? [];

      const lintStep = steps.find((s) => s.run?.includes('pnpm lint'));
      expect(lintStep).toBeDefined();
    });

    it('should run typecheck', async () => {
      const workflow = await loadWorkflow();
      const steps = workflow.jobs.test?.steps ?? [];

      const typecheckStep = steps.find(
        (s) => s.run?.includes('tsc') && s.run?.includes('--noEmit')
      );
      expect(typecheckStep).toBeDefined();
    });

    it('should build the project', async () => {
      const workflow = await loadWorkflow();
      const steps = workflow.jobs.test?.steps ?? [];

      const buildStep = steps.find((s) => s.run?.includes('pnpm build'));
      expect(buildStep).toBeDefined();
    });

    it('should run tests', async () => {
      const workflow = await loadWorkflow();
      const steps = workflow.jobs.test?.steps ?? [];

      const testStep = steps.find((s) => s.run?.includes('pnpm test:run'));
      expect(testStep).toBeDefined();
    });

    it('should run steps in correct order: install -> lint -> build -> typecheck -> test', async () => {
      const workflow = await loadWorkflow();
      const steps = workflow.jobs.test?.steps ?? [];

      const installIndex = steps.findIndex((s) => s.run?.includes('pnpm install'));
      const lintIndex = steps.findIndex((s) => s.run?.includes('pnpm lint'));
      const buildIndex = steps.findIndex((s) => s.run?.includes('pnpm build'));
      const typecheckIndex = steps.findIndex((s) => s.run?.includes('tsc'));
      const testIndex = steps.findIndex((s) => s.run?.includes('pnpm test:run'));

      // Build must come before typecheck so @claudetree/shared types are available
      expect(installIndex).toBeLessThan(lintIndex);
      expect(lintIndex).toBeLessThan(buildIndex);
      expect(buildIndex).toBeLessThan(typecheckIndex);
      expect(typecheckIndex).toBeLessThan(testIndex);
    });
  });
});

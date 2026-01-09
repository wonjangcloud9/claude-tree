import type { SessionProgress, ProgressStep } from '@claudetree/shared';

/**
 * Parse tool call content into tool name and parameters
 */
export function parseToolCall(
  content: string
): { toolName: string; parameters: Record<string, unknown> } | null {
  const match = content.match(/^(\w+):\s*(.+)$/);
  if (!match) return null;

  try {
    return {
      toolName: match[1] ?? '',
      parameters: JSON.parse(match[2] ?? '{}'),
    };
  } catch {
    return null;
  }
}

/**
 * Detect progress step from tool usage
 */
export function detectProgressStep(
  toolName: string,
  params: Record<string, unknown>
): ProgressStep | null {
  const command = String(params.command ?? '');

  if (toolName === 'Bash') {
    if (
      command.includes('test') ||
      command.includes('jest') ||
      command.includes('vitest') ||
      command.includes('pytest')
    ) {
      return 'testing';
    }
    if (command.includes('git commit')) {
      return 'committing';
    }
    if (command.includes('gh pr create') || command.includes('git push')) {
      return 'creating_pr';
    }
  }

  if (toolName === 'Edit' || toolName === 'Write') {
    return 'implementing';
  }

  if (toolName === 'Read' || toolName === 'Glob' || toolName === 'Grep') {
    return 'analyzing';
  }

  return null;
}

/**
 * Update progress state when a new step is detected
 * Only advances forward, never regresses
 */
export function updateProgress(
  progress: SessionProgress,
  newStep: ProgressStep
): SessionProgress {
  const stepOrder: ProgressStep[] = [
    'analyzing',
    'implementing',
    'testing',
    'committing',
    'creating_pr',
  ];
  const currentIdx = stepOrder.indexOf(progress.currentStep);
  const newIdx = stepOrder.indexOf(newStep);

  if (newIdx > currentIdx) {
    const completed = new Set(progress.completedSteps);
    for (let i = 0; i <= currentIdx; i++) {
      completed.add(stepOrder[i]!);
    }
    return {
      ...progress,
      currentStep: newStep,
      completedSteps: Array.from(completed),
    };
  }

  return progress;
}

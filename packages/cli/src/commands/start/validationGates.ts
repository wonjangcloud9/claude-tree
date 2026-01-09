import type { ValidationGate } from '@claudetree/shared';

/**
 * Parse gate string into ValidationGate array
 * Always includes 'install' gate first
 */
export function parseGates(gatesStr: string, testCommand?: string): ValidationGate[] {
  const gateNames = gatesStr.split(',').map((g) => g.trim().toLowerCase());
  const gates: ValidationGate[] = [];

  // Always include install gate first
  gates.push({
    name: 'install',
    command: 'pnpm install --frozen-lockfile',
    required: true,
  });

  for (const name of gateNames) {
    switch (name) {
      case 'test':
        gates.push({
          name: 'test',
          command: testCommand ?? 'pnpm test:run',
          required: true,
        });
        break;
      case 'type':
        gates.push({
          name: 'type',
          command: 'pnpm -r exec tsc --noEmit',
          required: true,
        });
        break;
      case 'lint':
        gates.push({
          name: 'lint',
          command: 'pnpm lint',
          required: false,
        });
        break;
      case 'build':
        gates.push({
          name: 'build',
          command: 'pnpm build',
          required: false,
        });
        break;
    }
  }

  return gates;
}

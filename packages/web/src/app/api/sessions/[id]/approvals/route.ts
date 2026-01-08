import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SerializedToolApproval } from '@claudetree/shared';
import { createApiErrorHandler, isExpectedError } from '@/lib/api-error';

const CONFIG_DIR = '.claudetree';
const APPROVALS_DIR = 'approvals';

interface Params {
  params: Promise<{ id: string }>;
}

const handleError = createApiErrorHandler('GET /api/sessions/[id]/approvals', {
  defaultMessage: 'Failed to read approvals',
});

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const cwd = process.env.CLAUDETREE_ROOT || process.cwd();
    const approvalsPath = join(cwd, CONFIG_DIR, APPROVALS_DIR, `${id}.json`);

    let approvals: SerializedToolApproval[] = [];
    try {
      const content = await readFile(approvalsPath, 'utf-8');
      approvals = JSON.parse(content);
    } catch (error) {
      // No approvals file yet - expected for new sessions
      if (!isExpectedError(error)) {
        throw error;
      }
    }

    return NextResponse.json(approvals);
  } catch (error) {
    return handleError(error);
  }
}

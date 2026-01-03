import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SerializedToolApproval } from '@claudetree/shared';

const CONFIG_DIR = '.claudetree';
const APPROVALS_DIR = 'approvals';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const cwd = process.cwd();
    const approvalsPath = join(cwd, CONFIG_DIR, APPROVALS_DIR, `${id}.json`);

    let approvals: SerializedToolApproval[] = [];
    try {
      const content = await readFile(approvalsPath, 'utf-8');
      approvals = JSON.parse(content);
    } catch {
      // No approvals file yet
    }

    return NextResponse.json(approvals);
  } catch {
    return NextResponse.json(
      { error: 'Failed to read approvals' },
      { status: 500 }
    );
  }
}

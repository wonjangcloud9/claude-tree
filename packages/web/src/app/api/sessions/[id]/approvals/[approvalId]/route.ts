import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SerializedToolApproval } from '@claudetree/shared';

const CONFIG_DIR = '.claudetree';
const APPROVALS_DIR = 'approvals';

interface Params {
  params: Promise<{ id: string; approvalId: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id, approvalId } = await params;
    const body = await request.json();
    const { status, approvedBy } = body as {
      status: 'approved' | 'rejected';
      approvedBy?: string;
    };

    const cwd = process.env.CLAUDETREE_ROOT || process.cwd();
    const approvalsPath = join(cwd, CONFIG_DIR, APPROVALS_DIR, `${id}.json`);

    let approvals: SerializedToolApproval[] = [];
    try {
      const content = await readFile(approvalsPath, 'utf-8');
      approvals = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: 'Approvals file not found' },
        { status: 404 }
      );
    }

    const index = approvals.findIndex((a) => a.id === approvalId);
    if (index === -1) {
      return NextResponse.json(
        { error: 'Approval not found' },
        { status: 404 }
      );
    }

    const approval = approvals[index];
    if (approval) {
      approval.status = status;
      approval.approvedBy = approvedBy ?? null;
      approval.resolvedAt = new Date().toISOString();
    }

    await writeFile(approvalsPath, JSON.stringify(approvals, null, 2));

    return NextResponse.json({ success: true, approval });
  } catch {
    return NextResponse.json(
      { error: 'Failed to update approval' },
      { status: 500 }
    );
  }
}

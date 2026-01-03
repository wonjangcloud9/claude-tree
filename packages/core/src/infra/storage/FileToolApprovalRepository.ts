import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  ApprovalStatus,
  SerializedToolApproval,
  ToolApproval,
} from '@claudetree/shared';
import type { IToolApprovalRepository } from '../../domain/repositories/IToolApprovalRepository.js';

const APPROVALS_DIR = 'approvals';

export class FileToolApprovalRepository implements IToolApprovalRepository {
  private readonly approvalsDir: string;

  constructor(configDir: string) {
    this.approvalsDir = join(configDir, APPROVALS_DIR);
  }

  async findBySessionId(sessionId: string): Promise<ToolApproval[]> {
    return this.loadApprovals(sessionId);
  }

  async findPending(sessionId: string): Promise<ToolApproval[]> {
    const approvals = await this.loadApprovals(sessionId);
    return approvals.filter((a) => a.status === 'pending');
  }

  async save(approval: ToolApproval): Promise<void> {
    const approvals = await this.loadApprovals(approval.sessionId);
    const index = approvals.findIndex((a) => a.id === approval.id);

    if (index >= 0) {
      approvals[index] = approval;
    } else {
      approvals.push(approval);
    }

    await this.saveApprovals(approval.sessionId, approvals);
  }

  async updateStatus(
    id: string,
    status: ApprovalStatus,
    approvedBy?: string
  ): Promise<void> {
    // Find which session has this approval
    const allFiles = await this.getAllSessionIds();

    for (const sessionId of allFiles) {
      const approvals = await this.loadApprovals(sessionId);
      const index = approvals.findIndex((a) => a.id === id);

      if (index >= 0) {
        const approval = approvals[index];
        if (approval) {
          approval.status = status;
          approval.approvedBy = approvedBy ?? null;
          approval.resolvedAt = new Date();
          await this.saveApprovals(sessionId, approvals);
        }
        return;
      }
    }
  }

  private getFilePath(sessionId: string): string {
    return join(this.approvalsDir, `${sessionId}.json`);
  }

  private async getAllSessionIds(): Promise<string[]> {
    try {
      const { readdir } = await import('node:fs/promises');
      const files = await readdir(this.approvalsDir);
      return files
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace('.json', ''));
    } catch {
      return [];
    }
  }

  private async loadApprovals(sessionId: string): Promise<ToolApproval[]> {
    try {
      const content = await readFile(this.getFilePath(sessionId), 'utf-8');
      const data = JSON.parse(content) as SerializedToolApproval[];
      return data.map(this.deserialize);
    } catch {
      return [];
    }
  }

  private async saveApprovals(
    sessionId: string,
    approvals: ToolApproval[]
  ): Promise<void> {
    await mkdir(this.approvalsDir, { recursive: true });
    const data = approvals.map(this.serialize);
    await writeFile(this.getFilePath(sessionId), JSON.stringify(data, null, 2));
  }

  private serialize(approval: ToolApproval): SerializedToolApproval {
    return {
      ...approval,
      requestedAt: approval.requestedAt.toISOString(),
      resolvedAt: approval.resolvedAt?.toISOString() ?? null,
    };
  }

  private deserialize(data: SerializedToolApproval): ToolApproval {
    return {
      ...data,
      requestedAt: new Date(data.requestedAt),
      resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : null,
    };
  }
}

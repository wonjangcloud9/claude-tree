import { randomUUID } from 'node:crypto';
import type { Session, WorktreeListItem } from '@claudetree/shared';
import type { ISessionRepository } from '../domain/repositories/ISessionRepository.js';
import type { IWorktreeRepository } from '../domain/repositories/IWorktreeRepository.js';

export class WorktreeSyncService {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly worktreeRepo: IWorktreeRepository
  ) {}

  /**
   * Sync worktrees with sessions.
   * Creates sessions for worktrees that don't have one.
   * Returns newly created sessions.
   */
  async sync(): Promise<Session[]> {
    const worktrees = await this.worktreeRepo.list();
    const sessions = await this.sessionRepo.findAll();

    const newSessions: Session[] = [];

    for (const worktree of worktrees) {
      // Skip main worktree
      if (worktree.isMainWorktree) continue;

      // Check if session exists for this worktree path
      const hasSession = sessions.some(
        (s) => s.worktreeId === worktree.path || this.matchWorktree(s, worktree)
      );

      if (!hasSession) {
        const session = this.createSessionFromWorktree(worktree);
        await this.sessionRepo.save(session);
        newSessions.push(session);
      }
    }

    return newSessions;
  }

  private matchWorktree(session: Session, worktree: WorktreeListItem): boolean {
    // Match by branch name pattern (issue-XX or task-XX)
    if (!worktree.branch) return false;

    const issueMatch = worktree.branch.match(/^issue-(\d+)/);
    if (issueMatch && session.issueNumber === parseInt(issueMatch[1] ?? '0', 10)) {
      return true;
    }

    return false;
  }

  private createSessionFromWorktree(worktree: WorktreeListItem): Session {
    // Extract issue number from branch name
    let issueNumber: number | null = null;
    if (worktree.branch) {
      const match = worktree.branch.match(/^issue-(\d+)/);
      if (match) {
        issueNumber = parseInt(match[1] ?? '0', 10);
      }
    }

    return {
      id: randomUUID(),
      worktreeId: worktree.path,
      claudeSessionId: null,
      status: 'pending',
      issueNumber,
      prompt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Recovery fields
      processId: null,
      osProcessId: null,
      lastHeartbeat: null,
      errorCount: 0,
      worktreePath: worktree.path,
      // Token usage
      usage: null,
    };
  }
}

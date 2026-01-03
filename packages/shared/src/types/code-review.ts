export type ReviewStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested';

export interface FileChange {
  path: string;
  additions: number;
  deletions: number;
  status: 'added' | 'modified' | 'deleted';
}

export interface CodeReview {
  id: string;
  sessionId: string;
  status: ReviewStatus;
  comment: string | null;
  changes: FileChange[];
  requestedAt: Date;
  resolvedAt: Date | null;
}

export interface SerializedCodeReview
  extends Omit<CodeReview, 'requestedAt' | 'resolvedAt'> {
  requestedAt: string;
  resolvedAt: string | null;
}

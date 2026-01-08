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

// AI-generated code review summary
export interface AIReviewSummary {
  sessionId: string;
  summary: string;
  whatChanged: string[];
  whyChanged: string;
  potentialIssues: AIReviewIssue[];
  suggestions: string[];
  riskLevel: 'low' | 'medium' | 'high';
  generatedAt: Date;
}

export interface AIReviewIssue {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  file?: string;
  line?: number;
}

export interface SerializedAIReviewSummary
  extends Omit<AIReviewSummary, 'generatedAt'> {
  generatedAt: string;
}

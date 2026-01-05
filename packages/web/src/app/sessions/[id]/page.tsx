'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type {
  Session,
  SessionEvent,
  ToolApproval,
  CodeReview,
} from '@claudetree/shared';
import { Timeline } from '@/components/timeline/Timeline';
import { TerminalOutput } from '@/components/terminal/TerminalOutput';
import { ApprovalList } from '@/components/approval/ApprovalList';
import { CodeReviewPanel } from '@/components/review/CodeReviewPanel';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [approvals, setApprovals] = useState<ToolApproval[]>([]);
  const [review, setReview] = useState<CodeReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [sessionRes, eventsRes, approvalsRes, reviewRes] = await Promise.all([
        fetch(`/api/sessions/${id}`),
        fetch(`/api/sessions/${id}/events?limit=100`),
        fetch(`/api/sessions/${id}/approvals`),
        fetch(`/api/sessions/${id}/review`),
      ]);

      if (!sessionRes.ok) throw new Error('Session not found');

      setSession(await sessionRes.json());
      const eventsData = await eventsRes.json();
      setEvents(eventsData.events || []);
      setApprovals(await approvalsRes.json());
      setReview(await reviewRes.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const wsUrl =
    typeof window !== 'undefined'
      ? `ws://${window.location.hostname}:3001`
      : 'ws://localhost:3001';

  useWebSocket({
    url: wsUrl,
    onMessage: (message: unknown) => {
      const msg = message as { payload?: { sessionId?: string } };
      if (msg.payload?.sessionId === id) {
        fetchData();
      }
    },
  });

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (approvalId: string) => {
    await fetch(`/api/sessions/${id}/approvals/${approvalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved', approvedBy: 'user' }),
    });
    fetchData();
  };

  const handleReject = async (approvalId: string) => {
    await fetch(`/api/sessions/${id}/approvals/${approvalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected', approvedBy: 'user' }),
    });
    fetchData();
  };

  const handleReviewAction = async (status: string) => {
    await fetch(`/api/sessions/${id}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchData();
  };

  const handleDelete = async () => {
    if (!confirm('Delete this session? This cannot be undone.')) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/');
      } else {
        alert('Failed to delete session');
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px' }}>Loading...</div>;
  }

  if (error || !session) {
    return (
      <div style={{ padding: '24px' }}>
        <Link href="/" style={{ color: 'var(--text-secondary)' }}>
          ← Back
        </Link>
        <p style={{ color: '#ef4444', marginTop: '16px' }}>{error || 'Session not found'}</p>
      </div>
    );
  }

  return (
    <main style={{ minHeight: '100vh', padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Link href="/" style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              ← Back to Dashboard
            </Link>
            <h1 style={{ fontSize: '24px', marginTop: '8px' }}>
              {session.issueNumber ? `Issue #${session.issueNumber}` : `Session ${id.slice(0, 8)}`}
            </h1>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Status: <strong>{session.status}</strong>
            </div>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              padding: '8px 16px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.5 : 1,
              fontSize: '14px',
            }}
          >
            {deleting ? 'Deleting...' : 'Delete Session'}
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px',
        }}
      >
        <section>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Terminal Output</h3>
          <TerminalOutput events={events} />
        </section>

        <section>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Timeline</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <Timeline events={events.filter((e) => e.type !== 'output')} />
          </div>
        </section>

        <section>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Tool Approvals</h3>
          <ApprovalList
            approvals={approvals}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </section>

        <section>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Code Review</h3>
          <CodeReviewPanel
            review={review}
            onApprove={() => handleReviewAction('approved')}
            onReject={() => handleReviewAction('rejected')}
            onRequestChanges={() => handleReviewAction('changes_requested')}
          />
        </section>
      </div>
    </main>
  );
}

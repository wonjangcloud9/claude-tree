import { NextResponse } from 'next/server';
import { readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { Session } from '@claudetree/shared';

const execAsync = promisify(exec);

const CONFIG_DIR = '.claudetree';
const SESSIONS_FILE = 'sessions.json';
const DELETED_FILE = 'deleted.json';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const cwd = process.cwd();
    const sessionsPath = join(cwd, CONFIG_DIR, SESSIONS_FILE);

    const content = await readFile(sessionsPath, 'utf-8');
    const sessions = JSON.parse(content) as Session[];
    const session = sessions.find((s) => s.id === id);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch {
    return NextResponse.json({ error: 'Failed to read session' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const cwd = process.cwd();
    const sessionsPath = join(cwd, CONFIG_DIR, SESSIONS_FILE);
    const deletedPath = join(cwd, CONFIG_DIR, DELETED_FILE);

    const content = await readFile(sessionsPath, 'utf-8');
    const sessions = JSON.parse(content) as Session[];
    const sessionIndex = sessions.findIndex((s) => s.id === id);

    if (sessionIndex === -1) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessions[sessionIndex];

    // Remove git worktree if it exists
    if (session?.worktreeId) {
      try {
        await execAsync(`git worktree remove "${session.worktreeId}" --force`, { cwd });
      } catch {
        // Worktree might not exist or already removed
      }

      // Add to deleted list (so it won't be re-synced if worktree still exists)
      let deleted: string[] = [];
      try {
        const deletedContent = await readFile(deletedPath, 'utf-8');
        deleted = JSON.parse(deletedContent);
      } catch {
        // File doesn't exist yet
      }

      if (!deleted.includes(session.worktreeId)) {
        deleted.push(session.worktreeId);
        await mkdir(join(cwd, CONFIG_DIR), { recursive: true });
        await writeFile(deletedPath, JSON.stringify(deleted, null, 2));
      }
    }

    // Remove session from list
    sessions.splice(sessionIndex, 1);
    await writeFile(sessionsPath, JSON.stringify(sessions, null, 2));

    // Clean up related files (events, approvals, reviews)
    const filesToDelete = [
      join(cwd, CONFIG_DIR, 'events', `${id}.json`),
      join(cwd, CONFIG_DIR, 'approvals', `${id}.json`),
      join(cwd, CONFIG_DIR, 'reviews', `${id}.json`),
    ];

    for (const file of filesToDelete) {
      try {
        await rm(file);
      } catch {
        // Ignore if file doesn't exist
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Session } from '@claudetree/shared';

const CONFIG_DIR = '.claudetree';
const SESSIONS_FILE = 'sessions.json';

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

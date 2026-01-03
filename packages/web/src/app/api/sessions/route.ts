import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const CONFIG_DIR = '.claudetree';
const SESSIONS_FILE = 'sessions.json';

export async function GET() {
  try {
    // Find project root (where .claudetree exists)
    const cwd = process.cwd();
    const sessionsPath = join(cwd, CONFIG_DIR, SESSIONS_FILE);

    const content = await readFile(sessionsPath, 'utf-8');
    const sessions = JSON.parse(content);

    return NextResponse.json(sessions);
  } catch {
    // Return empty array if no sessions file
    return NextResponse.json([]);
  }
}

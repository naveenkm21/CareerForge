import { NextResponse } from 'next/server';
import { isDatabaseConfigured, pingDb } from '@careerforge/db';

export const dynamic = 'force-dynamic';

/** Liveness + dependency health. Redis and the runner join in weeks 4 and 7. */
export async function GET() {
  const db = isDatabaseConfigured()
    ? await pingDb()
    : { ok: false, latencyMs: 0, error: 'DATABASE_URL not set' };
  const body = {
    status: db.ok ? 'ok' : 'degraded',
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
    checks: {
      db,
      redis: { ok: null, note: 'not configured (week 7)' },
      runner: { ok: null, note: 'not configured (week 4)' },
    },
    time: new Date().toISOString(),
  };
  return NextResponse.json(body, {
    status: db.ok ? 200 : 503,
    headers: { 'cache-control': 'no-store' },
  });
}

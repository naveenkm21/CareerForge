import { afterAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { closeDb, getDb } from '../client';

/**
 * ADR-001 is enforced by the database itself: evidence and XP rows can be appended, never
 * rewritten. The triggers are row-level, so this needs a database with rows (`pnpm db:demo`);
 * on an empty table there is nothing to reject and the case is skipped rather than passing.
 */
describe.skipIf(!process.env.DATABASE_URL)('append-only guards (integration)', () => {
  afterAll(() => closeDb());

  for (const [table, op, stmt] of [
    ['evidence_events', 'UPDATE', sql`update evidence_events set outcome = 1`],
    ['evidence_events', 'DELETE', sql`delete from evidence_events`],
    ['xp_ledger', 'UPDATE', sql`update xp_ledger set amount = 0`],
    ['xp_ledger', 'DELETE', sql`delete from xp_ledger`],
  ] as const) {
    it(`rejects ${op} on ${table}`, async (ctx) => {
      // postgres-js returns an array, PGlite returns { rows } — accept either.
      const res = (await getDb().execute(sql.raw(`select 1 from ${table} limit 1`))) as unknown;
      const rows = Array.isArray(res) ? res : (res as { rows: unknown[] }).rows;
      if (rows.length === 0) ctx.skip();
      const err = await getDb()
        .execute(stmt)
        .then(
          () => null,
          (e: unknown) => e as Error & { cause?: Error },
        );
      expect(err?.cause?.message ?? err?.message).toMatch(/append-only \(ADR-001\)/);
    });
  }
});

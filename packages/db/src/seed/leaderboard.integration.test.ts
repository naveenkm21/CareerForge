import { afterAll, describe, expect, it } from 'vitest';
import { closeDb } from '../client';
import { getLeaderboard } from '../repos/scoring';

/**
 * Date filters must go through column-typed helpers: a raw sql`… >= ${date}` passes on PGlite but
 * throws on postgres-js (CI and Neon). This runs against the real driver in CI.
 */
describe.skipIf(!process.env.DATABASE_URL)('leaderboard (integration)', () => {
  afterAll(() => closeDb());

  it('filters by date on every driver', async () => {
    const board = await getLeaderboard({ since: new Date(Date.now() - 7 * 86_400_000) });
    expect(Array.isArray(board)).toBe(true);
    const friends = await getLeaderboard({ since: new Date(0), userIds: [] });
    expect(friends).toEqual([]);
  });
});

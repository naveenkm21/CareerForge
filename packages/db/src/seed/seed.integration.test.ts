import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, getDb } from '../client';
import { algorithms, roleSkillReqs, skillEdges, skills } from '../schema';
import { loadContent } from './content';
import { seedContent } from './seed';

/**
 * Runs only when DATABASE_URL points at a migrated database (CI provides a Postgres service).
 * Verifies the Phase 1 exit criterion: the seed is re-runnable without duplication.
 */
describe.skipIf(!process.env.DATABASE_URL)('seedContent (integration)', () => {
  afterAll(() => closeDb());

  it('is idempotent — ids and counts are stable across runs', async () => {
    const db = getDb();
    const content = loadContent();
    await seedContent(db, content);
    const first = await db.select({ id: skills.id, slug: skills.slug }).from(skills);
    const r2 = await seedContent(db, content);
    const second = await db.select({ id: skills.id, slug: skills.slug }).from(skills);

    const sortBySlug = (rows: { id: string; slug: string }[]) =>
      [...rows].sort((a, b) => a.slug.localeCompare(b.slug));
    expect(sortBySlug(second)).toEqual(sortBySlug(first));
    expect(r2.flagsInserted).toBe(0);
    expect((await db.select().from(skillEdges)).length).toBe(content.taxonomy.edges.length);
    expect((await db.select().from(roleSkillReqs)).length).toBe(
      content.roles.reduce((n, r) => n + r.requirements.length, 0),
    );
    expect((await db.select().from(algorithms)).length).toBe(content.algorithms.length);
  });
});

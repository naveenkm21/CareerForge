import { and, asc, desc, eq, inArray, ne, or, sql } from 'drizzle-orm';
import { getDb } from '../client';
import {
  battleParticipants,
  battles,
  follows,
  problems,
  skills,
  submissions,
  users,
  userSkillState,
  xpLedger,
} from '../schema';
import { recordEvidence } from './scoring';

export async function listPeople(userId: string) {
  const db = getDb();
  const [people, mine] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        handle: users.handle,
        college: users.college,
        xp: sql<number>`coalesce((select sum(${xpLedger.amount}) from ${xpLedger} where ${xpLedger.userId} = ${users.id}), 0)::int`,
      })
      .from(users)
      .where(and(ne(users.id, userId), sql`${users.onboardedAt} is not null`))
      .orderBy(desc(sql`4`)),
    db.select({ id: follows.followeeId }).from(follows).where(eq(follows.followerId, userId)),
  ]);
  const following = new Set(mine.map((m) => m.id));
  return people.map((p) => ({ ...p, following: following.has(p.id) }));
}

export async function setFollow(userId: string, targetId: string, follow: boolean) {
  const db = getDb();
  if (userId === targetId) return;
  if (follow)
    await db
      .insert(follows)
      .values({ followerId: userId, followeeId: targetId })
      .onConflictDoNothing();
  else
    await db
      .delete(follows)
      .where(and(eq(follows.followerId, userId), eq(follows.followeeId, targetId)));
}

export async function followingIds(userId: string) {
  return (
    await getDb()
      .select({ id: follows.followeeId })
      .from(follows)
      .where(eq(follows.followerId, userId))
  ).map((r) => r.id);
}

// ── Battles ──────────────────────────────────────────────────────────────────

const BATTLE_SECONDS = 20 * 60;

/** Demo opponents are seeded accounts; they play deterministically from their own mastery. */
export const SIMULATED_HANDLES = new Set(['arjun', 'priya', 'rahul', 'sneha', 'kabir']);

export async function createBattle(userId: string, opponentId: string, skillId: string) {
  const db = getDb();
  const pool = await db
    .select({ id: problems.id })
    .from(problems)
    .where(and(eq(problems.skillId, skillId), eq(problems.status, 'published')))
    .orderBy(asc(problems.difficulty));
  let chosen = pool.map((p) => p.id);
  if (chosen.length < 3) {
    const [skill] = await db.select().from(skills).where(eq(skills.id, skillId));
    const domainPeers = await db
      .select({ id: problems.id })
      .from(problems)
      .innerJoin(skills, eq(skills.id, problems.skillId))
      .where(and(eq(skills.domain, skill!.domain), eq(problems.status, 'published')))
      .orderBy(asc(problems.difficulty));
    chosen = [...new Set([...chosen, ...domainPeers.map((p) => p.id)])];
  }
  chosen = chosen.slice(0, 3);
  if (chosen.length === 0) throw new Error('No problems available for that skill yet.');
  const [battle] = await db
    .insert(battles)
    .values({
      createdBy: userId,
      opponentId,
      skillId,
      problemIds: chosen,
      durationS: BATTLE_SECONDS,
      endsAt: new Date(Date.now() + BATTLE_SECONDS * 1000),
    })
    .returning();
  await db.insert(battleParticipants).values([
    { battleId: battle!.id, userId },
    { battleId: battle!.id, userId: opponentId },
  ]);
  return battle!;
}

export async function listBattles(userId: string) {
  const db = getDb();
  const mine = await db
    .select({ battleId: battleParticipants.battleId })
    .from(battleParticipants)
    .where(eq(battleParticipants.userId, userId));
  if (!mine.length) return [];
  const ids = mine.map((m) => m.battleId);
  const [rows, parts] = await Promise.all([
    db
      .select({ battle: battles, skill: skills })
      .from(battles)
      .innerJoin(skills, eq(skills.id, battles.skillId))
      .where(inArray(battles.id, ids))
      .orderBy(desc(battles.createdAt)),
    db
      .select({ p: battleParticipants, user: users })
      .from(battleParticipants)
      .innerJoin(users, eq(users.id, battleParticipants.userId))
      .where(inArray(battleParticipants.battleId, ids)),
  ]);
  return rows.map((r) => ({
    ...r,
    participants: parts.filter((p) => p.p.battleId === r.battle.id),
  }));
}

export async function getBattle(battleId: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .select({ battle: battles, skill: skills })
    .from(battles)
    .innerJoin(skills, eq(skills.id, battles.skillId))
    .where(eq(battles.id, battleId));
  if (!row) return null;
  const parts = await db
    .select({ p: battleParticipants, user: users })
    .from(battleParticipants)
    .innerJoin(users, eq(users.id, battleParticipants.userId))
    .where(eq(battleParticipants.battleId, battleId));
  if (!parts.some((p) => p.user.id === userId)) return null;
  const probs = await db
    .select({
      id: problems.id,
      slug: problems.slug,
      title: problems.title,
      difficulty: problems.difficulty,
    })
    .from(problems)
    .where(inArray(problems.id, row.battle.problemIds));
  return {
    ...row,
    participants: parts,
    problems: row.battle.problemIds.map((id) => probs.find((p) => p.id === id)!).filter(Boolean),
  };
}

/** Called when a battle submission is accepted. */
export async function recordBattleSolve(
  battleId: string,
  userId: string,
  problemId: string,
  alreadySolved: boolean,
) {
  const db = getDb();
  const [battle] = await db.select().from(battles).where(eq(battles.id, battleId));
  if (
    !battle ||
    battle.status !== 'active' ||
    alreadySolved ||
    !battle.problemIds.includes(problemId)
  )
    return;
  // Only the first accepted submission per problem counts towards the battle.
  const accepted = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(
      and(
        eq(submissions.battleId, battleId),
        eq(submissions.userId, userId),
        eq(submissions.problemId, problemId),
        eq(submissions.status, 'ac'),
      ),
    );
  if (accepted.length > 1) return;
  const elapsed = Math.round((Date.now() - battle.createdAt.getTime()) / 1000);
  await db
    .update(battleParticipants)
    .set({
      solved: sql`${battleParticipants.solved} + 1`,
      penaltyS: sql`${battleParticipants.penaltyS} + ${elapsed}`,
    })
    .where(and(eq(battleParticipants.battleId, battleId), eq(battleParticipants.userId, userId)));
}

/**
 * Settles a battle: simulated opponents get a deterministic result from their own mastery,
 * then both sides receive `battle.result` evidence (which also drives XP).
 */
export async function finishBattle(battleId: string, userId: string) {
  const db = getDb();
  const [battle] = await db.select().from(battles).where(eq(battles.id, battleId));
  if (!battle || battle.status === 'finished') return;
  const parts = await db
    .select({ p: battleParticipants, user: users })
    .from(battleParticipants)
    .innerJoin(users, eq(users.id, battleParticipants.userId))
    .where(eq(battleParticipants.battleId, battleId));
  for (const { p, user } of parts) {
    if (user.id !== userId && SIMULATED_HANDLES.has(user.handle ?? '') && !p.finishedAt) {
      const [state] = await db
        .select()
        .from(userSkillState)
        .where(and(eq(userSkillState.userId, user.id), eq(userSkillState.skillId, battle.skillId)));
      const mastery = state?.mastery ?? 0.4;
      const solved = Math.min(
        battle.problemIds.length,
        Math.round(mastery * battle.problemIds.length),
      );
      await db
        .update(battleParticipants)
        .set({ solved, penaltyS: solved * Math.round(420 - mastery * 200), finishedAt: new Date() })
        .where(
          and(eq(battleParticipants.battleId, battleId), eq(battleParticipants.userId, user.id)),
        );
    }
  }
  await db
    .update(battleParticipants)
    .set({ finishedAt: new Date() })
    .where(and(eq(battleParticipants.battleId, battleId), eq(battleParticipants.userId, userId)));
  const settled = await db
    .select()
    .from(battleParticipants)
    .where(eq(battleParticipants.battleId, battleId));
  const ranked = [...settled].sort((a, b) => b.solved - a.solved || a.penaltyS - b.penaltyS);
  await db.update(battles).set({ status: 'finished' }).where(eq(battles.id, battleId));
  for (const [i, p] of ranked.entries()) {
    const won =
      i === 0 &&
      (ranked.length < 2 ||
        ranked[0]!.solved > ranked[1]!.solved ||
        ranked[0]!.penaltyS < ranked[1]!.penaltyS);
    await recordEvidence(p.userId, [
      {
        skillId: battle.skillId,
        kind: 'battle.result',
        sourceType: 'battle',
        sourceId: battleId,
        outcome: won ? 1 : p.solved / battle.problemIds.length / 2,
        difficulty: 0.6,
        meta: { solved: p.solved, rank: i + 1 },
      },
    ]);
  }
}

export async function opponentsFor(userId: string) {
  return getDb()
    .select({ id: users.id, name: users.name, handle: users.handle })
    .from(users)
    .where(and(ne(users.id, userId), sql`${users.onboardedAt} is not null`))
    .orderBy(asc(users.name));
}

export async function battlesInvolving(userId: string) {
  return getDb()
    .select()
    .from(battles)
    .where(or(eq(battles.createdBy, userId), eq(battles.opponentId, userId)));
}

/** Problems this user has accepted *within* a battle (earlier solves don't count). */
export async function battleSolvedProblemIds(battleId: string, userId: string) {
  const rows = await getDb()
    .selectDistinct({ problemId: submissions.problemId })
    .from(submissions)
    .where(
      and(
        eq(submissions.battleId, battleId),
        eq(submissions.userId, userId),
        eq(submissions.status, 'ac'),
      ),
    );
  return new Set(rows.map((r) => r.problemId));
}

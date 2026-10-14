import { and, desc, eq, inArray } from 'drizzle-orm';
import { extractSkills, jobFit } from '@careerforge/core';
import { getDb } from '../client';
import {
  applications,
  jobs,
  jobSkills,
  resumes,
  skills,
  type ApplicationStatus,
  type ParsedResume,
} from '../schema';
import { replaceJobSkills } from '../seed/curriculum';
import { recordEvidence } from './scoring';
import { uuidv7 } from '../uuid';

type Ctx = { states: Map<string, { mastery: number; evidenceCount: number }> };

async function skillIndex() {
  const rows = await getDb()
    .select({ id: skills.id, slug: skills.slug, name: skills.name })
    .from(skills);
  return {
    bySlug: new Map(rows.map((r) => [r.slug, r])),
    byId: new Map(rows.map((r) => [r.id, r])),
  };
}

// ── Resume ───────────────────────────────────────────────────────────────────

const SECTION_HEADS = ['experience', 'projects', 'education', 'skills', 'achievements', 'summary'];

/**
 * Parses pasted resume text deterministically: sections by heading, skills by keyword with the
 * snippet that proves each match. Claims start UNVERIFIED — the user confirms them, and even then
 * they are weak evidence (`resume.claimed`, weight 0.3) until practice backs them up.
 */
export async function saveResume(userId: string, filename: string, rawText: string) {
  const { bySlug } = await skillIndex();
  const matches = extractSkills(rawText).filter(
    (m) => bySlug.has(m.slug) && m.slug !== 'dev.projects',
  );
  const sections: Record<string, string> = {};
  let current = 'header';
  for (const line of rawText.split('\n')) {
    const head = SECTION_HEADS.find((h) => new RegExp(`^\\s*${h}\\b`, 'i').test(line));
    if (head) current = head;
    else sections[current] = `${sections[current] ?? ''}${line}\n`;
  }
  const warnings: string[] = [];
  if (rawText.trim().split(/\s+/).length < 150)
    warnings.push('This looks short — paste the full resume text for an accurate analysis.');
  const parsed: ParsedResume = {
    skills: matches.map((m) => ({
      skillId: bySlug.get(m.slug)!.id,
      slug: m.slug,
      name: bySlug.get(m.slug)!.name,
      snippet: m.snippet,
      verified: false,
    })),
    sections,
    warnings,
  };
  const [row] = await getDb()
    .insert(resumes)
    .values({ userId, filename, rawText, parsed })
    .returning();
  return row!;
}

export async function getLatestResume(userId: string) {
  const [row] = await getDb()
    .select()
    .from(resumes)
    .where(eq(resumes.userId, userId))
    .orderBy(desc(resumes.createdAt))
    .limit(1);
  return row ?? null;
}

/** The user confirms which claims are real; confirmed claims become weak evidence. */
export async function verifyResumeSkills(
  userId: string,
  resumeId: string,
  verifiedSkillIds: string[],
) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)));
  if (!row) throw new Error('resume not found');
  const set = new Set(verifiedSkillIds);
  const parsed: ParsedResume = {
    ...row.parsed,
    skills: row.parsed.skills.map((s) => ({ ...s, verified: set.has(s.skillId) })),
  };
  await db.insert(resumes).values({ userId, filename: row.filename, rawText: row.rawText, parsed });
  const newly = parsed.skills.filter(
    (s) => s.verified && !row.parsed.skills.find((o) => o.skillId === s.skillId)?.verified,
  );
  await recordEvidence(
    userId,
    newly.map((s) => ({
      skillId: s.skillId,
      kind: 'resume.claimed',
      sourceType: 'resume',
      sourceId: `${resumeId}:${s.slug}`,
      outcome: 0.7,
      difficulty: 0.3,
      meta: { snippet: s.snippet },
    })),
  );
}

// ── Jobs ─────────────────────────────────────────────────────────────────────

export async function listJobsWithFit(ctx: Ctx, opts: { roleSlug?: string | null } = {}) {
  const db = getDb();
  const [jobRows, skillRows] = await Promise.all([
    db.select().from(jobs).orderBy(desc(jobs.postedAt)),
    db.select().from(jobSkills),
  ]);
  const masteryOf = (id: string) => {
    const s = ctx.states.get(id);
    return s && s.evidenceCount > 0 ? s.mastery : null;
  };
  return jobRows
    .map((j) => {
      const js = skillRows.filter((s) => s.jobId === j.id);
      const fit = jobFit(js, masteryOf);
      return {
        ...j,
        fit: fit.score,
        gaps: fit.rows.filter((r) => r.status === 'gap' || r.status === 'unmeasured').length,
        skillCount: js.length,
        matchesRole: !opts.roleSlug || j.roleSlug === opts.roleSlug,
      };
    })
    .sort((a, b) => Number(b.matchesRole) - Number(a.matchesRole) || b.fit - a.fit);
}

export async function getJobWithGap(jobId: string, ctx: Ctx) {
  const db = getDb();
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job) return null;
  const js = await db
    .select({ js: jobSkills, skill: skills })
    .from(jobSkills)
    .innerJoin(skills, eq(skills.id, jobSkills.skillId))
    .where(eq(jobSkills.jobId, jobId));
  const masteryOf = (id: string) => {
    const s = ctx.states.get(id);
    return s && s.evidenceCount > 0 ? s.mastery : null;
  };
  const fit = jobFit(
    js.map((r) => ({ skillId: r.skill.id, importance: r.js.importance })),
    masteryOf,
  );
  const meta = new Map(js.map((r) => [r.skill.id, r]));
  return {
    job,
    fit: fit.score,
    rows: fit.rows.map((r) => ({
      ...r,
      skill: meta.get(r.skillId)!.skill,
      snippet: meta.get(r.skillId)!.js.snippet,
    })),
  };
}

/** Paste-a-JD: stored as a private job and analysed with the same extractor. */
export async function createJobFromText(
  userId: string,
  input: { title: string; company: string; description: string },
) {
  const db = getDb();
  const { bySlug } = await skillIndex();
  const [row] = await db
    .insert(jobs)
    .values({
      source: 'pasted',
      externalId: uuidv7(),
      title: input.title,
      company: input.company,
      location: '—',
      description: input.description,
      createdBy: userId,
    })
    .returning();
  await replaceJobSkills(
    db,
    row!.id,
    input.description,
    new Map([...bySlug].map(([slug, s]) => [slug, s.id])),
  );
  return row!;
}

// ── Applications ─────────────────────────────────────────────────────────────

export async function listApplications(userId: string) {
  return getDb()
    .select({ app: applications, job: jobs })
    .from(applications)
    .innerJoin(jobs, eq(jobs.id, applications.jobId))
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.updatedAt));
}

export async function upsertApplication(
  userId: string,
  jobId: string,
  status: ApplicationStatus,
  notes?: string,
) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(applications)
    .where(and(eq(applications.userId, userId), eq(applications.jobId, jobId)));
  const entry = { status, at: new Date().toISOString() };
  if (existing) {
    await db
      .update(applications)
      .set({
        status,
        notes: notes ?? existing.notes,
        timeline: existing.status === status ? existing.timeline : [...existing.timeline, entry],
      })
      .where(eq(applications.id, existing.id));
  } else {
    await db
      .insert(applications)
      .values({ userId, jobId, status, notes: notes ?? '', timeline: [entry] });
  }
}

export async function applicationStatusFor(userId: string, jobIds: string[]) {
  if (!jobIds.length) return new Map<string, ApplicationStatus>();
  const rows = await getDb()
    .select({ jobId: applications.jobId, status: applications.status })
    .from(applications)
    .where(and(eq(applications.userId, userId), inArray(applications.jobId, jobIds)));
  return new Map(rows.map((r) => [r.jobId, r.status]));
}

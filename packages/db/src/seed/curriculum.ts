import { eq } from 'drizzle-orm';
import { extractSkills } from '@careerforge/core';
import { STARTERS, testcasesFor } from '@careerforge/content';
import type { Database } from '../client';
import { jobs, jobSkills, lessons, problems, problemTestcases, questions, topics } from '../schema';
import type { ContentBundle } from './content';

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Curriculum seed: topics → lessons, problems → testcases, questions, sample jobs. Upserted by
 * natural key; testcases and job skills are replaced wholesale per parent. Expected outputs come
 * from each problem's reference implementation, so they cannot drift from the answer.
 */
export async function seedCurriculum(
  tx: Tx,
  c: ContentBundle['curriculum'],
  idBySlug: Map<string, string>,
) {
  let sort = 0;
  for (const t of c.topics) {
    const [topic] = await tx
      .insert(topics)
      .values({
        slug: t.slug,
        skillId: idBySlug.get(t.skill)!,
        title: t.title,
        blurb: t.blurb,
        sort: sort++,
        estMinutes: t.lessons.reduce((m, l) => m + l.estMinutes, 0),
      })
      .onConflictDoUpdate({
        target: topics.slug,
        set: {
          skillId: idBySlug.get(t.skill)!,
          title: t.title,
          blurb: t.blurb,
          sort: sort - 1,
          estMinutes: t.lessons.reduce((m, l) => m + l.estMinutes, 0),
        },
      })
      .returning({ id: topics.id });
    for (const [i, l] of t.lessons.entries()) {
      await tx
        .insert(lessons)
        .values({
          topicId: topic!.id,
          slug: l.slug,
          title: l.title,
          stage: l.stage,
          sort: i,
          estMinutes: l.estMinutes,
          blocks: l.blocks,
        })
        .onConflictDoUpdate({
          target: [lessons.topicId, lessons.slug],
          set: {
            title: l.title,
            stage: l.stage,
            sort: i,
            estMinutes: l.estMinutes,
            blocks: l.blocks,
          },
        });
    }
  }

  for (const p of c.problems) {
    const values = {
      slug: p.slug,
      skillId: idBySlug.get(p.skill)!,
      title: p.title,
      difficulty: p.difficulty,
      statement: p.statement,
      inputFormat: p.inputFormat,
      outputFormat: p.outputFormat,
      constraints: p.constraints,
      starterCode: STARTERS(p),
      referenceSolution: { cpp: p.cpp },
      hints: p.hints,
      tags: p.tags,
      algorithmId: p.algorithmId ?? null,
    };
    const [row] = await tx
      .insert(problems)
      .values(values)
      .onConflictDoUpdate({ target: problems.slug, set: values })
      .returning({ id: problems.id });
    await tx.delete(problemTestcases).where(eq(problemTestcases.problemId, row!.id));
    await tx.insert(problemTestcases).values(
      testcasesFor(p).map((tc, i) => ({
        problemId: row!.id,
        input: tc.input,
        expected: tc.expected,
        isSample: tc.isSample,
        sort: i,
      })),
    );
  }

  for (const q of c.questions) {
    const values = {
      slug: q.slug,
      skillId: idBySlug.get(q.skill)!,
      prompt: q.prompt,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      placement: q.placement ?? false,
    };
    await tx
      .insert(questions)
      .values(values)
      .onConflictDoUpdate({ target: questions.slug, set: values });
  }

  const now = Date.now();
  for (const j of c.jobs) {
    const values = {
      source: 'sample',
      externalId: j.externalId,
      title: j.title,
      company: j.company,
      location: j.location,
      remote: j.remote,
      description: j.description,
      minExp: j.minExp,
      roleSlug: j.roleSlug,
      postedAt: new Date(now - j.daysAgo * 86_400_000),
    };
    const [row] = await tx
      .insert(jobs)
      .values(values)
      .onConflictDoUpdate({ target: [jobs.source, jobs.externalId], set: values })
      .returning({ id: jobs.id });
    await replaceJobSkills(tx, row!.id, j.description, idBySlug);
  }
}

/** Extracts skills from a job description and stores them with the evidencing snippet. */
export async function replaceJobSkills(
  tx: Tx | Database,
  jobId: string,
  description: string,
  idBySlug: Map<string, string>,
) {
  await tx.delete(jobSkills).where(eq(jobSkills.jobId, jobId));
  const matches = extractSkills(description).filter((m) => idBySlug.has(m.slug));
  if (!matches.length) return;
  const max = Math.max(...matches.map((m) => m.count));
  await tx.insert(jobSkills).values(
    matches.map((m) => ({
      jobId,
      skillId: idBySlug.get(m.slug)!,
      importance: Number((0.5 + 0.5 * (m.count / max)).toFixed(2)),
      snippet: m.snippet,
    })),
  );
}

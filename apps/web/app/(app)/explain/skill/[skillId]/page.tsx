import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProblemsBySlug, getSkillExplanation, listAlgorithmsBySkill } from '@careerforge/db';
import { PRIOR_MASTERY } from '@careerforge/core';
import { PROBLEMS } from '@careerforge/content';
import {
  Badge,
  buttonClasses,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Meter,
} from '@careerforge/ui';
import { requireOnboarded } from '@/lib/session';

export const metadata: Metadata = { title: 'Skill evidence' };
export const dynamic = 'force-dynamic';

const pct = (x: number) => `${Math.round(x * 100)}%`;
const KIND: Record<string, string> = {
  'lesson.viewed': 'Lesson completed',
  'checkpoint.answered': 'Checkpoint',
  'question.answered': 'Quiz question',
  'assessment.completed': 'Placement question',
  'submission.judged': 'Judged submission',
  'explanation.scored': 'Explanation',
  'interview.scored': 'Mock interview round',
  'battle.result': 'Battle',
  'resume.claimed': 'Resume claim (verified)',
};

/** The bottom of the drill-down: each event and how much it moved this skill. */
export default async function SkillExplainPage({
  params,
}: {
  params: Promise<{ skillId: string }>;
}) {
  const actor = await requireOnboarded();
  const { skillId } = await params;
  const ex = await getSkillExplanation(actor.id, skillId);
  if (!ex) notFound();
  const p = ex.projection;
  const viz = (await listAlgorithmsBySkill()).get(skillId) ?? [];
  const practice = await getProblemsBySlug(
    PROBLEMS.filter((x) => x.skill === ex.skill.slug).map((x) => x.slug),
    actor.id,
  );

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <nav className="text-xs text-fg-muted">
        <Link href="/dashboard" className="hover:text-fg">
          Dashboard
        </Link>{' '}
        /{' '}
        <Link href="/explain/readiness" className="hover:text-fg">
          Readiness
        </Link>{' '}
        / {ex.skill.name}
      </nav>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">{ex.skill.name}</h1>
          <p className="text-sm text-fg-muted">{ex.skill.summary}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold text-fg">{p ? pct(p.mastery) : '—'}</p>
          <p className="text-xs text-fg-muted">
            {p ? `${p.status} · confidence ${pct(p.confidence)}` : 'not measured yet'}
          </p>
        </div>
      </header>

      <Card>
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-fg-subtle">Mastery vs role target</p>
            <Meter
              value={p?.mastery ?? null}
              target={ex.requirement?.targetMastery}
              label="mastery"
              className="mt-2"
            />
            <p className="mt-1 text-xs text-fg-muted">
              {ex.requirement
                ? `target ${pct(ex.requirement.targetMastery)} · ${ex.requirement.tier}`
                : 'not required by your role'}
            </p>
          </div>
          <div>
            <p className="text-xs text-fg-subtle">Evidence</p>
            <p className="text-sm font-semibold text-fg">{p?.evidenceCount ?? 0} events</p>
            <p className="text-xs text-fg-muted">
              {p?.lastEvidenceAt ? `last ${p.lastEvidenceAt.toLocaleDateString()}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-fg-subtle">Next review</p>
            <p className="text-sm font-semibold text-fg">
              {p?.nextReviewAt ? p.nextReviewAt.toLocaleDateString() : '—'}
            </p>
            <p className="text-xs text-fg-muted">when decayed confidence drops below 50%</p>
          </div>
        </CardBody>
      </Card>

      {ex.prereqs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Prerequisites (gate effective mastery)</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-2">
            {ex.prereqs.map((q) => {
              const pm = q.state?.mastery ?? PRIOR_MASTERY;
              return (
                <Link
                  key={q.skill.id}
                  href={`/explain/skill/${q.skill.id}`}
                  className="flex items-center justify-between gap-3 text-sm hover:text-accent"
                >
                  <span>{q.skill.name}</span>
                  <span className="text-xs text-fg-muted">
                    {q.state ? pct(pm) : 'not measured'} → caps this skill at{' '}
                    {pct(0.55 + 0.45 * pm)}
                  </span>
                </Link>
              );
            })}
          </CardBody>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {viz.map((v) => (
          <Link
            key={v.registryId}
            href={`/viz/${v.registryId}`}
            className={buttonClasses('secondary', 'sm')}
          >
            Visualize {v.title}
          </Link>
        ))}
        {practice.map((q) => (
          <Link
            key={q.slug}
            href={`/practice/${q.slug}`}
            className={buttonClasses(q.solved ? 'ghost' : 'primary', 'sm')}
          >
            {q.solved ? '✓ ' : ''}
            {q.title}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evidence log (newest first)</CardTitle>
          <span className="text-xs text-fg-muted">append-only · each row’s effect on mastery</span>
        </CardHeader>
        <CardBody>
          {ex.contributions.length === 0 ? (
            <p className="text-sm text-fg-muted">No evidence yet for this skill.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-fg-subtle">
                  <th className="py-1 font-medium">When</th>
                  <th className="py-1 font-medium">What</th>
                  <th className="py-1 font-medium">Result</th>
                  <th className="py-1 text-right font-medium">Δ mastery</th>
                </tr>
              </thead>
              <tbody>
                {ex.contributions.slice(0, 60).map((c) => {
                  const e = c.event;
                  const meta = e.meta as Record<string, unknown>;
                  const href =
                    e.sourceType === 'submission'
                      ? `/practice/submission/${e.sourceId}`
                      : e.sourceType === 'interview'
                        ? `/interview/${e.sourceId}`
                        : null;
                  return (
                    <tr key={c.eventId} className="border-t border-border/60">
                      <td className="py-1.5 pr-3 text-xs whitespace-nowrap text-fg-muted">
                        {e.occurredAt.toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-1.5 pr-3">
                        {href ? (
                          <Link href={href} className="text-accent hover:underline">
                            {KIND[e.kind] ?? e.kind}
                          </Link>
                        ) : (
                          (KIND[e.kind] ?? e.kind)
                        )}
                        {typeof meta.status === 'string' && (
                          <Badge className="ml-2">{meta.status.toUpperCase()}</Badge>
                        )}
                      </td>
                      <td className="py-1.5 pr-3 text-xs text-fg-muted">
                        {e.outcome >= 1
                          ? 'correct'
                          : e.outcome <= 0
                            ? 'incorrect'
                            : `${Math.round(e.outcome * 100)}%`}
                      </td>
                      <td
                        className={`py-1.5 text-right font-mono text-xs tabular-nums ${c.delta >= 0 ? 'text-tone-found' : 'text-tone-error'}`}
                      >
                        {c.delta >= 0 ? '+' : '−'}
                        {Math.abs(c.delta * 100).toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </main>
  );
}

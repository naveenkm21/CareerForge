import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Briefcase,
  Check,
  Flame,
  Sparkles,
  Target,
} from 'lucide-react';
import {
  greetingFor,
  PILLAR_LABELS,
  PRIOR_MASTERY,
  prioritize,
  REASON_COPY,
  type PillarKey,
} from '@careerforge/core';
import {
  getGamification,
  getReadinessHistory,
  getTodayPlan,
  listJobsWithFit,
} from '@careerforge/db';
import {
  Badge,
  buttonClasses,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Meter,
} from '@careerforge/ui';
import { TrendLine } from '@/components/charts';
import { requireOnboarded } from '@/lib/session';

export const metadata: Metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

const pct = (x: number) => `${Math.round(x * 100)}%`;
const KIND_LABEL = {
  lesson: 'Lesson',
  visualize: 'Visualize',
  practice: 'Practice',
  interview: 'Interview',
} as const;

export default async function DashboardPage() {
  const actor = await requireOnboarded();
  const { items, readiness, ctx } = await getTodayPlan(actor.id);
  if (!ctx.role) redirect('/onboarding');
  const [game, history, jobs] = await Promise.all([
    getGamification(actor.id, actor.timezone),
    getReadinessHistory(actor.id, 30),
    listJobsWithFit(ctx, { roleSlug: ctx.role.slug }),
  ]);

  const evidenceCount = ctx.events.length;
  const matched = jobs.filter((j) => j.matchesRole && j.fit >= 0.5);
  const minutes = items.reduce((m, i) => m + i.minutes, 0);
  const done = items.filter((i) => i.done).length;

  // Skills panel: the role's DSA + CS requirements, weakest relative to target first.
  const skillRows = ctx.reqs
    .map((r) => {
      const s = ctx.skillById.get(r.skillId)!;
      const st = ctx.states.get(r.skillId);
      return {
        id: r.skillId,
        name: s.name,
        domain: s.domain,
        tier: r.tier,
        target: r.targetMastery,
        mastery: st && st.evidenceCount > 0 ? st.mastery : null,
        status: st?.status ?? 'untouched',
      };
    })
    .filter((r) => r.domain === 'dsa' || r.domain === 'cs');
  const measured = skillRows
    .filter((r) => r.mastery !== null)
    .sort((a, b) => b.mastery! / b.target - a.mastery! / a.target);
  const showSkills = [...measured.slice(0, 4), ...measured.slice(-4).reverse()]
    .filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i)
    .slice(0, 8);

  // Recommendation: the planner's top priority, phrased with its blocker (docs/04 §1.4).
  const top = prioritize({
    requirements: ctx.reqs.map((r) => ({
      skillId: r.skillId,
      name: ctx.skillById.get(r.skillId)!.name,
      tier: r.tier,
      weight: r.weight,
      target: r.targetMastery,
    })),
    states: ctx.states,
    prereqsOf: ctx.prereqsOf,
    nameOf: (id) => ctx.skillById.get(id)?.name ?? id,
    catalog: new Map(),
    completed: new Set(),
    completedToday: new Set(),
    dailyMinutes: actor.dailyMinutesTarget,
    now: new Date(),
    weekday: 1,
    readiness: readiness.overall,
  })[0];
  const name = (id: string) => ctx.skillById.get(id)?.name ?? id;
  const m = (id: string) => ctx.states.get(id)?.mastery ?? PRIOR_MASTERY;

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-fg-muted">{greetingFor(new Date(), actor.timezone)},</p>
          <h1 className="text-4xl font-normal tracking-[-0.021em] text-fg sm:text-5xl">
            {actor.name ?? actor.handle}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {ctx.role.title} · {actor.dailyMinutesTarget} min/day ·{' '}
            <Link href="/onboarding" className="text-accent hover:underline">
              change goal
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Stat
            icon={<Flame size={16} aria-hidden />}
            label="Streak"
            value={`${game.streak.current} day${game.streak.current === 1 ? '' : 's'}`}
            sub={game.streak.activeToday ? 'active today' : 'study today to keep it'}
          />
          <Stat
            icon={<Sparkles size={16} aria-hidden />}
            label="XP"
            value={game.totalXp.toLocaleString()}
            sub={`+${game.todayXp} today · level ${game.level}`}
          />
          <Stat
            icon={<Award size={16} aria-hidden />}
            label="Badges"
            value={String(game.badges.length)}
            sub={`of ${game.allBadges.length}`}
          />
        </div>
      </section>

      {evidenceCount === 0 && (
        <Card className="border-accent">
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-fg">Start by measuring where you are</p>
              <p className="text-sm text-fg-muted">
                A 10-question placement assessment seeds your skill model. No evidence, no number.
              </p>
            </div>
            <Link href="/assessment" className={buttonClasses('primary', 'sm')}>
              Take the placement <ArrowRight size={14} aria-hidden />
            </Link>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Job readiness · {ctx.role.title}</CardTitle>
            <Link
              href="/explain/readiness"
              className="text-xs font-medium text-accent hover:underline"
            >
              Why this number? →
            </Link>
          </CardHeader>
          <CardBody className="flex flex-col gap-5">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              <Link
                href="/explain/readiness"
                className="font-display text-7xl font-normal tracking-[-0.03em] text-fg transition-colors hover:text-accent"
                aria-label={`Readiness ${pct(readiness.overall)}, explain`}
              >
                {evidenceCount ? pct(readiness.overall) : '—'}
              </Link>
              <p className="max-w-sm pb-1 text-sm text-fg-muted">
                From {evidenceCount} evidence event{evidenceCount === 1 ? '' : 's'}. Every number
                below drills down to the events that produced it.
              </p>
            </div>
            {readiness.blockers.length > 0 && evidenceCount > 0 && (
              <p className="flex items-start gap-2 rounded-md bg-tone-active-soft px-3 py-2 text-sm text-fg">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-tone-active" aria-hidden />
                <span>
                  {readiness.blockers.length} core skill
                  {readiness.blockers.length > 1 ? 's are' : ' is'} below the bar
                  {readiness.overall >= 0.7 ? ', which caps readiness at 70%' : ''}:{' '}
                  {readiness.blockers
                    .slice(0, 3)
                    .map((b) => b.name)
                    .join(', ')}
                  {readiness.blockers.length > 3 ? '…' : '.'}
                </span>
              </p>
            )}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(Object.keys(readiness.pillars) as PillarKey[]).map((k) => {
                const v = readiness.pillars[k];
                return (
                  <li key={k}>
                    <Link
                      href={`/explain/readiness#pillar-${k}`}
                      className="block rounded-lg border border-border bg-surface-2 px-3 py-2.5 hover:border-accent"
                    >
                      <p className="text-xs font-semibold text-fg">{PILLAR_LABELS[k]}</p>
                      <p className="text-lg font-semibold text-fg">{v === null ? '—' : pct(v)}</p>
                      <Meter value={v} label={`${PILLAR_LABELS[k]} pillar`} className="mt-1" />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div>
              <p className="mb-2 text-xs text-fg-subtle">Readiness, last 30 days</p>
              <TrendLine
                points={history.map((h) => ({ x: h.takenOn.slice(5), y: h.overall }))}
                label="Readiness"
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today’s plan</CardTitle>
            <span className="text-xs text-fg-muted">
              {done}/{items.length} done · {minutes} min
            </span>
          </CardHeader>
          <CardBody>
            {items.length === 0 ? (
              <EmptyState title="Nothing scheduled">
                Your role targets are met or there is no content for your gaps yet.
              </EmptyState>
            ) : (
              <ol className="flex flex-col gap-2">
                {items.map((i) => (
                  <li key={i.refId}>
                    <Link
                      href={i.href}
                      className="group flex items-start gap-3 rounded-lg border border-border px-3 py-2.5 hover:border-accent"
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${i.done ? 'border-tone-found bg-tone-found text-white' : 'border-border-strong'}`}
                        aria-label={i.done ? 'done' : 'not done'}
                      >
                        {i.done && <Check size={12} aria-hidden />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-sm font-medium ${i.done ? 'text-fg-muted line-through' : 'text-fg'}`}
                          >
                            {i.title}
                          </span>
                          <Badge>{KIND_LABEL[i.kind]}</Badge>
                        </span>
                        <span className="mt-0.5 block text-xs text-fg-muted" title={i.reasonCode}>
                          {REASON_COPY[i.reasonCode]} — {i.reasonDetail}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-fg-subtle tabular-nums">
                        {i.minutes}m
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-3 text-[11px] text-fg-subtle">
              Chosen deterministically from your gaps, prerequisites and decay — the same inputs
              always give the same plan.
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Your skills</CardTitle>
            <Link href="/skills" className="text-xs font-medium text-accent hover:underline">
              Skill graph →
            </Link>
          </CardHeader>
          <CardBody>
            {showSkills.length === 0 ? (
              <EmptyState title="No skill measured yet">
                Answer checkpoints, solve a problem or take the placement assessment.
              </EmptyState>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {showSkills.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/explain/skill/${s.id}`}
                      className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_3.5rem] items-center gap-3 hover:text-accent"
                    >
                      <span className="truncate text-sm text-fg">{s.name}</span>
                      <Meter value={s.mastery} target={s.target} label={`${s.name} mastery`} />
                      <span className="flex items-center justify-end gap-1 text-xs font-semibold text-fg tabular-nums">
                        {s.mastery! < s.target * 0.7 && (
                          <AlertTriangle
                            size={12}
                            className="text-tone-active"
                            aria-label="well below target"
                          />
                        )}
                        {pct(s.mastery!)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-fg-subtle">
              The tick marks the mastery your role expects. ⚠ = below 70% of that target.
            </p>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recommended</CardTitle>
              <Target size={15} className="text-fg-subtle" aria-hidden />
            </CardHeader>
            <CardBody className="flex flex-col gap-2">
              {top ? (
                <>
                  <p className="text-sm text-fg">
                    {top.via ? (
                      <>
                        <strong>{name(top.via)}</strong> is at {pct(m(top.via))} — but the real
                        blocker is <strong>{name(top.skillId)}</strong> ({pct(m(top.skillId))}),
                        which gates it.
                      </>
                    ) : (
                      <>
                        <strong>{name(top.skillId)}</strong> is your largest gap against the role
                        target.
                      </>
                    )}
                  </p>
                  <Link
                    href={`/explain/skill/${top.skillId}`}
                    className={buttonClasses('primary', 'sm', 'w-fit')}
                  >
                    Work on {name(top.skillId)} <ArrowRight size={14} aria-hidden />
                  </Link>
                </>
              ) : (
                <p className="text-sm text-fg-muted">You have met every target for this role.</p>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm text-fg">
                <Briefcase size={16} className="text-fg-subtle" aria-hidden />
                <span>
                  <strong>{matched.length}</strong> {ctx.role.title} opening
                  {matched.length === 1 ? '' : 's'} match you (≥ 50% fit)
                </span>
              </span>
              <Link href="/career/jobs" className="text-xs font-medium text-accent hover:underline">
                See gaps →
              </Link>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Badges</CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="flex flex-wrap gap-2">
                {game.allBadges.map((b) => (
                  <li key={b.slug} title={b.description}>
                    <Badge
                      tone={b.earned ? 'accent' : 'neutral'}
                      className={b.earned ? '' : 'opacity-50'}
                    >
                      {b.earned ? '🏅' : '○'} {b.name}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2">
      <span className="text-fg-subtle">{icon}</span>
      <div>
        <p className="text-[11px] text-fg-subtle">{label}</p>
        <p className="text-sm font-semibold text-fg">{value}</p>
        <p className="text-[10px] text-fg-subtle">{sub}</p>
      </div>
    </div>
  );
}

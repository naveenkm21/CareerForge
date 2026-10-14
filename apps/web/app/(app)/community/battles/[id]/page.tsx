import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { battleSolvedProblemIds, getBattle, SIMULATED_HANDLES } from '@careerforge/db';
import {
  Badge,
  Button,
  buttonClasses,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from '@careerforge/ui';
import { requireOnboarded } from '@/lib/session';
import { finishBattleAction } from '../../actions';
import { Countdown } from './countdown';

export const metadata: Metadata = { title: 'Battle' };
export const dynamic = 'force-dynamic';

export default async function BattlePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireOnboarded();
  const { id } = await params;
  const b = await getBattle(id, actor.id);
  if (!b) notFound();
  const active = b.battle.status === 'active';
  const inBattle = await battleSolvedProblemIds(b.battle.id, actor.id);
  const solved = b.problems.map((p) => inBattle.has(p.id));
  const ranked = [...b.participants].sort(
    (x, y) => y.p.solved - x.p.solved || x.p.penaltyS - y.p.penaltyS,
  );

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <nav className="text-xs text-fg-muted">
        <Link href="/community/battles" className="hover:text-fg">
          Battles
        </Link>{' '}
        / {b.skill.name}
      </nav>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          {b.participants.map((p) => p.user.name).join(' vs ')} · {b.skill.name}
        </h1>
        {active ? (
          <Countdown endsAt={b.battle.endsAt.toISOString()} />
        ) : (
          <Badge tone="success">finished</Badge>
        )}
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Scoreboard</CardTitle>
        </CardHeader>
        <CardBody>
          <ol className="flex flex-col gap-2">
            {ranked.map((p, i) => (
              <li key={p.user.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  {!active && i === 0 && '🏆 '}
                  <span className="font-medium text-fg">{p.user.name}</span>
                  {SIMULATED_HANDLES.has(p.user.handle ?? '') && (
                    <span className="ml-2 text-xs text-fg-subtle">practice opponent</span>
                  )}
                </span>
                <span className="text-fg-muted tabular-nums">
                  {active && p.user.id !== actor.id && SIMULATED_HANDLES.has(p.user.handle ?? '')
                    ? 'plays at settle'
                    : `${p.p.solved} solved · ${Math.round(p.p.penaltyS / 60)} min`}
                </span>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>
      <ol className="flex flex-col gap-2">
        {b.problems.map((p, i) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3"
          >
            <span className="text-sm font-medium text-fg">
              {i + 1}. {p.title} {solved[i] && <Badge tone="success">solved</Badge>}
            </span>
            {active && (
              <Link
                href={`/practice/${p.slug}?battle=${b.battle.id}`}
                className={buttonClasses('primary', 'sm')}
              >
                Solve
              </Link>
            )}
          </li>
        ))}
      </ol>
      {active && (
        <form action={finishBattleAction.bind(null, b.battle.id)}>
          <Button type="submit" variant="secondary">
            I’m done — settle the battle
          </Button>
        </form>
      )}
    </main>
  );
}

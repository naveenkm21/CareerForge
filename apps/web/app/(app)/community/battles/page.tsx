import type { Metadata } from 'next';
import Link from 'next/link';
import { listBattles, listSkills, opponentsFor, SIMULATED_HANDLES } from '@careerforge/db';
import { PROBLEMS } from '@careerforge/content';
import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from '@careerforge/ui';
import { requireOnboarded } from '@/lib/session';
import { createBattleAction } from '../actions';

export const metadata: Metadata = { title: 'Battles' };
export const dynamic = 'force-dynamic';

export default async function BattlesPage() {
  const actor = await requireOnboarded();
  const [battles, opponents, skills] = await Promise.all([
    listBattles(actor.id),
    opponentsFor(actor.id),
    listSkills(),
  ]);
  const battleSkills = skills.filter(
    (s) => PROBLEMS.some((p) => p.skill === s.slug) && s.domain === 'dsa',
  );
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <nav className="text-xs text-fg-muted">
        <Link href="/community" className="hover:text-fg">
          Community
        </Link>{' '}
        / Battles
      </nav>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-fg">1v1 battles</h1>
        <p className="mt-1 text-fg-muted">
          Three problems, twenty minutes. Most solved wins; ties go to the faster solver. Win +200
          XP, play +50 XP.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Challenge someone</CardTitle>
        </CardHeader>
        <CardBody>
          <form action={createBattleAction} className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-fg-muted">Opponent</span>
              <select
                name="opponent"
                className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-fg"
              >
                {opponents.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} {SIMULATED_HANDLES.has(o.handle ?? '') ? '(practice opponent)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-fg-muted">Topic</span>
              <select
                name="skill"
                className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-fg"
              >
                {battleSkills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" size="sm">
              Start battle
            </Button>
          </form>
          <p className="mt-3 text-xs text-fg-subtle">
            Practice opponents are demo accounts that play from their own measured mastery when the
            battle settles.
          </p>
        </CardBody>
      </Card>
      <ul className="flex flex-col gap-2">
        {battles.map((b) => {
          const me = b.participants.find((p) => p.user.id === actor.id)!;
          const them = b.participants.find((p) => p.user.id !== actor.id);
          const won =
            b.battle.status === 'finished' &&
            them &&
            (me.p.solved > them.p.solved ||
              (me.p.solved === them.p.solved && me.p.penaltyS < them.p.penaltyS));
          return (
            <li key={b.battle.id}>
              <Link
                href={`/community/battles/${b.battle.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 hover:border-accent"
              >
                <span>
                  <span className="block text-sm font-medium text-fg">
                    vs {them?.user.name} · {b.skill.name}
                  </span>
                  <span className="text-xs text-fg-muted">
                    {b.battle.createdAt.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </span>
                <span className="flex items-center gap-2 text-sm tabular-nums">
                  {me.p.solved}–{them?.p.solved ?? 0}
                  <Badge
                    tone={b.battle.status === 'active' ? 'warning' : won ? 'success' : 'neutral'}
                  >
                    {b.battle.status === 'active' ? 'live' : won ? 'won' : 'lost'}
                  </Badge>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

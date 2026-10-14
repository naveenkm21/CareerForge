import type { Metadata } from 'next';
import Link from 'next/link';
import { Swords, Trophy } from 'lucide-react';
import { followingIds, getLeaderboard, listPeople } from '@careerforge/db';
import {
  Badge,
  Button,
  buttonClasses,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  cn,
} from '@careerforge/ui';
import { requireOnboarded } from '@/lib/session';
import { followAction } from './actions';

export const metadata: Metadata = { title: 'Community' };
export const dynamic = 'force-dynamic';

const SCOPES = [
  { id: 'weekly', label: 'This week' },
  { id: 'friends', label: 'Friends' },
  { id: 'college', label: 'College' },
  { id: 'all', label: 'All time' },
] as const;

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const actor = await requireOnboarded();
  const sp = await searchParams;
  const scope = SCOPES.some((s) => s.id === sp.scope) ? sp.scope! : 'weekly';
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const people = await listPeople(actor.id);
  const friends = await followingIds(actor.id);
  const sameCollege = people
    .filter((p) => p.college && p.college === actor.college)
    .map((p) => p.id);
  const board = await getLeaderboard({
    since: scope === 'all' ? new Date(0) : weekAgo,
    userIds:
      scope === 'friends'
        ? [actor.id, ...friends]
        : scope === 'college'
          ? [actor.id, ...sameCollege]
          : undefined,
    limit: 25,
  });

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="flex flex-col gap-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-fg">Community</h1>
            <p className="mt-1 text-fg-muted">
              XP comes from the same evidence as your mastery, capped per skill per day — it can’t
              be farmed.
            </p>
          </div>
          <Link href="/community/battles" className={buttonClasses('primary', 'sm')}>
            <Swords size={14} aria-hidden /> 1v1 battles
          </Link>
        </header>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy size={14} aria-hidden /> Leaderboard
            </CardTitle>
            <nav className="flex gap-1">
              {SCOPES.map((s) => (
                <Link
                  key={s.id}
                  href={`/community?scope=${s.id}`}
                  aria-current={scope === s.id ? 'page' : undefined}
                  className={cn(
                    'rounded px-2 py-1 text-xs',
                    scope === s.id
                      ? 'bg-surface-3 font-medium text-fg'
                      : 'text-fg-muted hover:text-fg',
                  )}
                >
                  {s.label}
                </Link>
              ))}
            </nav>
          </CardHeader>
          <CardBody>
            {board.length === 0 ? (
              <p className="text-sm text-fg-muted">No XP earned in this window yet.</p>
            ) : (
              <ol className="flex flex-col">
                {board.map((row, i) => (
                  <li
                    key={row.userId}
                    className={cn(
                      'flex items-center gap-3 border-b border-border/60 py-2 last:border-b-0',
                      row.userId === actor.id && 'rounded-md bg-accent-soft/50 px-2',
                    )}
                  >
                    <span
                      className={cn(
                        'w-6 text-center text-sm font-semibold tabular-nums',
                        i < 3 ? 'text-tone-active' : 'text-fg-subtle',
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1">
                      <span className="text-sm font-medium text-fg">{row.name}</span>
                      <span className="block text-xs text-fg-subtle">
                        @{row.handle}
                        {row.college ? ` · ${row.college}` : ''}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-fg tabular-nums">
                      {row.xp.toLocaleString()} XP
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      </section>
      <aside>
        <Card>
          <CardHeader>
            <CardTitle>People</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-2">
            {people.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="flex-1">
                  <span className="block text-sm text-fg">{p.name}</span>
                  <span className="text-xs text-fg-subtle">{p.xp.toLocaleString()} XP</span>
                </span>
                {p.college === actor.college && <Badge>same college</Badge>}
                <form action={followAction.bind(null, p.id, !p.following)}>
                  <Button type="submit" size="sm" variant={p.following ? 'ghost' : 'secondary'}>
                    {p.following ? 'Following' : 'Follow'}
                  </Button>
                </form>
              </div>
            ))}
          </CardBody>
        </Card>
      </aside>
    </main>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { listApplications } from '@careerforge/db';
import { requireOnboarded } from '@/lib/session';
import { setApplicationAction } from '../actions';

export const metadata: Metadata = { title: 'Applications' };
export const dynamic = 'force-dynamic';

const COLUMNS = [
  { id: 'saved', label: 'Saved' },
  { id: 'applied', label: 'Applied' },
  { id: 'oa', label: 'Online assessment' },
  { id: 'interview', label: 'Interview' },
  { id: 'offer', label: 'Offer' },
  { id: 'rejected', label: 'Closed' },
] as const;

export default async function ApplicationsPage() {
  const actor = await requireOnboarded();
  const apps = await listApplications(actor.id);
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <nav className="text-xs text-fg-muted">
        <Link href="/career" className="hover:text-fg">
          Career
        </Link>{' '}
        / Applications
      </nav>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-fg">Applications</h1>
        <p className="mt-1 text-fg-muted">
          Every status change is timestamped, so you can see how long each stage takes.
        </p>
      </header>
      {apps.length === 0 ? (
        <p className="text-sm text-fg-muted">
          Nothing tracked yet.{' '}
          <Link href="/career/jobs" className="text-accent hover:underline">
            Browse jobs →
          </Link>
        </p>
      ) : (
        <div className="grid gap-3 overflow-x-auto md:grid-cols-3 xl:grid-cols-6">
          {COLUMNS.map((c, ci) => {
            const items = apps.filter((a) => a.app.status === c.id);
            return (
              <section
                key={c.id}
                aria-label={c.label}
                className="flex min-w-48 flex-col gap-2 rounded-[var(--radius)] bg-surface-2 p-2"
              >
                <h2 className="flex items-center justify-between px-1 pt-1 text-xs font-semibold tracking-wider text-fg-subtle uppercase">
                  {c.label} <span>{items.length}</span>
                </h2>
                {items.map(({ app, job }) => {
                  const next = COLUMNS[ci + 1];
                  const since = app.timeline[app.timeline.length - 1]?.at;
                  return (
                    <article
                      key={app.id}
                      className="rounded-lg border border-border bg-surface p-3"
                    >
                      <Link
                        href={`/career/jobs/${job.id}`}
                        className="text-sm font-medium text-fg hover:text-accent"
                      >
                        {job.title}
                      </Link>
                      <p className="text-xs text-fg-muted">{job.company}</p>
                      {app.notes && <p className="mt-1 text-xs text-fg">{app.notes}</p>}
                      {since && (
                        <p className="mt-1 text-[11px] text-fg-subtle">
                          since{' '}
                          {new Date(since).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      )}
                      {next && c.id !== 'rejected' && (
                        <form
                          action={setApplicationAction.bind(null, job.id, next.id)}
                          className="mt-2"
                        >
                          <button
                            type="submit"
                            className="text-xs font-medium text-accent hover:underline"
                          >
                            Move to {next.label} →
                          </button>
                        </form>
                      )}
                    </article>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

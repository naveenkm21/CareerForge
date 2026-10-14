import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { applicationStatusFor, listJobsWithFit, loadScoringContext } from '@careerforge/db';
import { Badge, buttonClasses, Meter } from '@careerforge/ui';
import { requireOnboarded } from '@/lib/session';

export const metadata: Metadata = { title: 'Jobs' };
export const dynamic = 'force-dynamic';

export default async function JobsPage() {
  const actor = await requireOnboarded();
  const ctx = await loadScoringContext(actor.id);
  const jobs = await listJobsWithFit(ctx, { roleSlug: ctx.role?.slug });
  const status = await applicationStatusFor(
    actor.id,
    jobs.map((j) => j.id),
  );
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <nav className="text-xs text-fg-muted">
        <Link href="/career" className="hover:text-fg">
          Career
        </Link>{' '}
        / Jobs
      </nav>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-normal tracking-[-0.021em] text-fg sm:text-5xl">Jobs</h1>
          <p className="mt-1 max-w-2xl text-fg-muted">
            Fit = importance-weighted share of each job’s skills where your evidence meets the bar.
            Sample listings from fictional companies; paste any real JD to analyse it the same way.
          </p>
        </div>
        <Link href="/career/jobs/new" className={buttonClasses('primary', 'sm')}>
          Paste a job description
        </Link>
      </header>
      <ul className="flex flex-col gap-3">
        {jobs
          .filter((j) => j.source === 'sample' || j.createdBy === actor.id)
          .map((j) => (
            <li key={j.id}>
              <Link
                href={`/career/jobs/${j.id}`}
                className="grid gap-3 rounded-[var(--radius)] border border-border bg-surface p-4 hover:border-accent sm:grid-cols-[minmax(0,1fr)_12rem]"
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-fg">{j.title}</span>
                    {j.matchesRole && <Badge tone="accent">your role</Badge>}
                    {j.source === 'pasted' && <Badge>pasted</Badge>}
                    {status.get(j.id) && <Badge tone="success">{status.get(j.id)}</Badge>}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-fg-muted">
                    <span>{j.company}</span>
                    <span className="flex items-center gap-1">
                      <MapPin size={12} aria-hidden /> {j.location}
                      {j.remote ? ' · remote' : ''}
                    </span>
                    <span>{j.minExp ? `${j.minExp}+ yrs` : 'new grad'}</span>
                  </span>
                </span>
                <span className="flex flex-col justify-center gap-1">
                  <span className="flex justify-between text-xs">
                    <span className="text-fg-muted">fit</span>
                    <span className="font-semibold text-fg">{Math.round(j.fit * 100)}%</span>
                  </span>
                  <Meter value={j.fit} label={`${j.title} fit`} />
                  <span className="text-[11px] text-fg-subtle">
                    {j.gaps} of {j.skillCount} skills below the bar
                  </span>
                </span>
              </Link>
            </li>
          ))}
      </ul>
    </main>
  );
}

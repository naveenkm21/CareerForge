import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, Briefcase, KanbanSquare, ClipboardPaste } from 'lucide-react';
import {
  getLatestResume,
  listApplications,
  listJobsWithFit,
  loadScoringContext,
  readinessFor,
} from '@careerforge/db';
import { Card, CardBody } from '@careerforge/ui';
import { requireOnboarded } from '@/lib/session';

export const metadata: Metadata = { title: 'Career' };
export const dynamic = 'force-dynamic';

export default async function CareerPage() {
  const actor = await requireOnboarded();
  const ctx = await loadScoringContext(actor.id);
  const [resume, apps, jobs, readiness] = await Promise.all([
    getLatestResume(actor.id),
    listApplications(actor.id),
    listJobsWithFit(ctx, { roleSlug: ctx.role?.slug }),
    readinessFor(ctx),
  ]);
  const tiles = [
    {
      href: '/career/resume',
      icon: FileText,
      title: 'Resume',
      value:
        readiness.pillars.resume === null
          ? 'not analysed'
          : `${Math.round(readiness.pillars.resume * 100)}% resume score`,
      body: resume
        ? `${resume.parsed.skills.length} skills found · ${resume.parsed.skills.filter((s) => s.verified).length} verified`
        : 'Paste your resume to extract and verify skills.',
    },
    {
      href: '/career/jobs',
      icon: Briefcase,
      title: 'Jobs & skill gaps',
      value: `${jobs.filter((j) => j.matchesRole && j.fit >= 0.5).length} strong matches`,
      body: `${jobs.length} openings, each mapped to the skills it asks for.`,
    },
    {
      href: '/career/applications',
      icon: KanbanSquare,
      title: 'Applications',
      value: `${apps.length} tracked`,
      body: apps.length
        ? `${apps.filter((a) => a.app.status === 'interview').length} at interview stage`
        : 'Save a job to start tracking.',
    },
    {
      href: '/career/jobs/new',
      icon: ClipboardPaste,
      title: 'Paste a job description',
      value: 'see your gap',
      body: 'Any JD → skills it requires → what you are missing → where to learn it.',
    },
  ];
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-fg">Career</h1>
        <p className="mt-1 text-fg-muted">
          The loop closes here: job → skill gap → roadmap → evidence → readiness → application.
        </p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {tiles.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="block h-full">
              <Card className="h-full transition-colors hover:border-accent">
                <CardBody className="flex flex-col gap-2">
                  <t.icon size={20} className="text-accent" aria-hidden />
                  <p className="font-semibold text-fg">{t.title}</p>
                  <p className="text-sm font-medium text-fg">{t.value}</p>
                  <p className="text-sm text-fg-muted">{t.body}</p>
                </CardBody>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

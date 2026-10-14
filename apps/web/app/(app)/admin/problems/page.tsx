import type { Metadata } from 'next';
import Link from 'next/link';
import { listProblemsForAdmin } from '@careerforge/db';
import { Badge, buttonClasses } from '@careerforge/ui';
import { requireAdmin } from '@/lib/session';

export const metadata: Metadata = { title: 'Problem CMS' };
export const dynamic = 'force-dynamic';

export default async function AdminProblemsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const rows = await listProblemsForAdmin();
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <nav className="text-xs text-fg-muted">
        <Link href="/admin" className="hover:text-fg">
          Admin
        </Link>{' '}
        / Problems
      </nav>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-normal tracking-[-0.021em] text-fg sm:text-5xl">
            Problem CMS
          </h1>
          <p className="mt-1 text-fg-muted">
            Create and version problems without a deploy. Every save bumps the version and is
            audit-logged.
          </p>
        </div>
        <Link href="/admin/problems/new" className={buttonClasses('primary', 'sm')}>
          New problem
        </Link>
      </header>
      {sp.saved && (
        <p className="rounded-md bg-tone-found-soft px-3 py-2 text-sm text-fg">
          Saved “{sp.saved}”.
        </p>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-fg-subtle">
            <th className="py-2 font-medium">Problem</th>
            <th className="py-2 font-medium">Skill</th>
            <th className="py-2 font-medium">Diff.</th>
            <th className="py-2 font-medium">Cases</th>
            <th className="py-2 font-medium">Version</th>
            <th className="py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border/60">
              <td className="py-2">
                <Link
                  href={`/admin/problems/${r.slug}`}
                  className="font-medium text-accent hover:underline"
                >
                  {r.title}
                </Link>
              </td>
              <td className="py-2 text-fg-muted">{r.skill}</td>
              <td className="py-2 tabular-nums">{r.difficulty}</td>
              <td className="py-2 tabular-nums">{r.cases}</td>
              <td className="py-2 tabular-nums">v{r.version}</td>
              <td className="py-2">
                <Badge tone={r.status === 'published' ? 'success' : 'warning'}>{r.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

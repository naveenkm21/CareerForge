import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@careerforge/ui';
import { requireOnboarded } from '@/lib/session';
import { pasteJobAction } from '../../actions';

export const metadata: Metadata = { title: 'Paste a job description' };

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireOnboarded();
  const sp = await searchParams;
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <nav className="text-xs text-fg-muted">
        <Link href="/career/jobs" className="hover:text-fg">
          Jobs
        </Link>{' '}
        / Paste
      </nav>
      <header>
        <h1 className="text-4xl font-normal tracking-[-0.021em] text-fg sm:text-5xl">
          Paste a job description
        </h1>
        <p className="mt-1 text-fg-muted">
          We extract the skills it asks for — each with the sentence that mentions it — and compare
          them with your evidence. The text is treated as data and stays private to you.
        </p>
      </header>
      <form action={pasteJobAction} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="title"
            placeholder="Job title"
            className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-fg"
          />
          <input
            name="company"
            placeholder="Company"
            className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-fg"
          />
        </div>
        <textarea
          name="description"
          required
          rows={14}
          placeholder="Paste the full job description…"
          className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-fg outline-none focus:border-accent"
        />
        {sp.error === 'short' && (
          <p className="text-sm text-tone-error">
            Paste the full description — that was too short to analyse.
          </p>
        )}
        <Button type="submit" className="w-fit">
          Show my gap
        </Button>
      </form>
    </main>
  );
}

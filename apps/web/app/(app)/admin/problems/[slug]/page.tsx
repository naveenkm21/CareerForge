import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProblem, listSkillsForSelect } from '@careerforge/db';
import { requireAdmin } from '@/lib/session';
import { ProblemEditor } from './editor';

export const metadata: Metadata = { title: 'Edit problem' };
export const dynamic = 'force-dynamic';

export default async function EditProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const isNew = slug === 'new';
  const [p, skills] = await Promise.all([
    isNew ? Promise.resolve(null) : getProblem(slug),
    listSkillsForSelect(),
  ]);
  if (!isNew && !p) notFound();
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <nav className="text-xs text-fg-muted">
        <Link href="/admin/problems" className="hover:text-fg">
          Problems
        </Link>{' '}
        / {isNew ? 'new' : p!.problem.title}
      </nav>
      <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">
        {isNew ? 'New problem' : `Edit · v${p!.problem.version}`}
      </h1>
      <ProblemEditor
        skills={skills}
        initial={
          p
            ? {
                slug: p.problem.slug,
                title: p.problem.title,
                skillId: p.problem.skillId,
                difficulty: p.problem.difficulty,
                statement: p.problem.statement,
                inputFormat: p.problem.inputFormat,
                outputFormat: p.problem.outputFormat,
                constraints: p.problem.constraints,
                status: p.problem.status,
                reference: p.problem.referenceSolution.cpp ?? '',
                testcases: p.testcases.map((t) => ({
                  input: t.input,
                  expected: t.expected,
                  isSample: t.isSample,
                })),
              }
            : null
        }
      />
    </main>
  );
}

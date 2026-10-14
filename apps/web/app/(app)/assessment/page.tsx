import type { Metadata } from 'next';
import { getPlacementQuestions, listSkills } from '@careerforge/db';
import { requireOnboarded } from '@/lib/session';
import { PlacementForm } from './placement-form';

export const metadata: Metadata = { title: 'Placement assessment' };
export const dynamic = 'force-dynamic';

export default async function AssessmentPage() {
  await requireOnboarded();
  const [qs, skills] = await Promise.all([getPlacementQuestions(), listSkills()]);
  const name = new Map(skills.map((s) => [s.id, s.name]));
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-4xl font-normal tracking-[-0.021em] text-fg sm:text-5xl">
          Placement assessment
        </h1>
        <p className="mt-2 text-fg-muted">
          {qs.length} questions across your role’s foundations. There is no pass mark: answers seed
          your skill model as evidence, so the planner knows where to start. Guessing makes the plan
          worse — skip nothing, but don’t bluff.
        </p>
      </header>
      <PlacementForm
        questions={qs.map((q) => ({
          slug: q.slug,
          prompt: q.prompt,
          options: q.options,
          skillName: name.get(q.skillId) ?? '',
        }))}
      />
    </main>
  );
}

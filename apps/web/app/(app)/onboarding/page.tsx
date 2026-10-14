import type { Metadata } from 'next';
import { getPrimaryEnrollment, getRoleRequirements, listRoles } from '@careerforge/db';
import { getFlags } from '@/lib/flags';
import { requireActor } from '@/lib/session';
import { OnboardingForm } from './onboarding-form';

export const metadata: Metadata = { title: 'Get started' };

export default async function OnboardingPage() {
  const actor = await requireActor();
  const [roles, flags, enrollment] = await Promise.all([
    listRoles(),
    getFlags(actor.id),
    getPrimaryEnrollment(actor.id),
  ]);
  const available = roles.filter((r) => r.slug === 'sde' || flags[`roles.${r.slug}`] !== false);
  const withCounts = await Promise.all(
    available.map(async (r) => ({
      slug: r.slug,
      title: r.title,
      description: r.description,
      skillCount: (await getRoleRequirements(r.id)).length,
    })),
  );
  withCounts.sort((a, b) =>
    a.slug === 'sde' ? -1 : b.slug === 'sde' ? 1 : a.title.localeCompare(b.title),
  );

  const suggestedHandle = (actor.email ?? actor.name ?? 'learner')
    .split('@')[0]!
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 20);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-xs text-accent">{actor.onboardedAt ? 'Update your goal' : 'Welcome'}</p>
      <h1 className="mt-1 text-4xl font-normal tracking-[-0.021em] text-fg sm:text-5xl">
        Let’s set your target.
      </h1>
      <p className="mt-2 mb-8 max-w-xl text-fg-muted">
        CareerForge measures where you actually are against a specific role. Nothing is scored until
        you produce evidence — so your dashboard starts honest: empty.
      </p>
      <OnboardingForm
        roles={withCounts}
        defaults={{
          name: actor.name ?? '',
          handle: actor.handle ?? (suggestedHandle.length >= 3 ? suggestedHandle : ''),
          roleSlug: enrollment?.role.slug ?? withCounts[0]?.slug ?? 'sde',
          dailyMinutes: actor.dailyMinutesTarget,
          timezone: actor.onboardedAt ? actor.timezone : null,
        }}
      />
    </main>
  );
}

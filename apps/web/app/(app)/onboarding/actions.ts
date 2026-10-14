'use server';

import { redirect } from 'next/navigation';
import { onboardingInput } from '@careerforge/contracts';
import { completeOnboarding, HandleTakenError } from '@careerforge/db';
import { getFlags } from '@/lib/flags';
import { requireActor } from '@/lib/session';

export type OnboardingState = { errors: Record<string, string>; formError: string | null };

export async function completeOnboardingAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const actor = await requireActor();
  const parsed = onboardingInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues)
      errors[String(issue.path[0] ?? 'form')] ??= issue.message;
    return { errors, formError: null };
  }
  const flags = await getFlags(actor.id);
  if (parsed.data.roleSlug !== 'sde' && flags[`roles.${parsed.data.roleSlug}`] === false) {
    return { errors: { roleSlug: 'That role is not available yet' }, formError: null };
  }
  try {
    await completeOnboarding(actor, parsed.data);
  } catch (err) {
    if (err instanceof HandleTakenError)
      return { errors: { handle: 'That handle is taken' }, formError: null };
    console.error('[onboarding]', err);
    return { errors: {}, formError: 'Something went wrong saving your profile. Please try again.' };
  }
  redirect('/dashboard');
}

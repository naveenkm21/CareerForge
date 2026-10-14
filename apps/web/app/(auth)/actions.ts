'use server';

import { redirect } from 'next/navigation';
import { devSignIn, devSignOut, authProvider } from '@careerforge/auth/server';
import { safeRedirectPath } from '@/lib/session';

export type SignInState = { error: string | null };

export async function devSignInAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  try {
    await devSignIn({
      email: String(formData.get('email') ?? ''),
      name: String(formData.get('name') ?? ''),
    });
  } catch (err) {
    return { error: (err as Error).message };
  }
  redirect(safeRedirectPath(formData.get('redirect_url')));
}

export async function signOutAction(): Promise<void> {
  if (authProvider() === 'dev') await devSignOut();
  redirect('/');
}

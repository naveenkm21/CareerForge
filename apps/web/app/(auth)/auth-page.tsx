import Link from 'next/link';
import { SignInPanel } from '@careerforge/auth/react';
import { safeRedirectPath } from '@/lib/session';
import { DevSignInForm } from './dev-sign-in-form';

export async function AuthPage({
  mode,
  searchParams,
}: {
  mode: 'sign-in' | 'sign-up';
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const redirectUrl = safeRedirectPath(sp.redirect_url);
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          {mode === 'sign-in' ? 'Sign in' : 'Create your account'}
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          {mode === 'sign-in'
            ? 'Pick up where you left off.'
            : 'Tell us your target role and we’ll measure where you stand.'}
        </p>
      </div>
      <SignInPanel mode={mode} fallback={<DevSignInForm redirectUrl={redirectUrl} mode={mode} />} />
      <p className="text-sm text-fg-muted">
        {mode === 'sign-in' ? (
          <>
            New here?{' '}
            <Link href="/sign-up" className="font-medium text-accent hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href="/sign-in" className="font-medium text-accent hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </main>
  );
}

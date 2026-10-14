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
    <main className="relative mx-auto flex max-w-md flex-col gap-6 px-4 py-16 sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-10 -z-10 mx-auto h-72 w-72 rounded-full bg-accent/25 blur-[100px]"
      />
      <div>
        <p className="mb-3 font-mono text-sm text-accent-2">
          {mode === 'sign-in' ? '// welcome back' : '// readiness = f(evidence)'}
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-fg sm:text-5xl">
          {mode === 'sign-in' ? 'Sign in' : 'Create your account'}
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          {mode === 'sign-in'
            ? 'Pick up where you left off.'
            : 'Tell us your target role and we’ll measure where you stand.'}
        </p>
      </div>
      <div className="rounded-[calc(var(--radius)+6px)] border border-border bg-surface p-6 shadow-[0_30px_80px_-30px_rgb(139_92_246/0.45)]">
        <SignInPanel
          mode={mode}
          fallback={<DevSignInForm redirectUrl={redirectUrl} mode={mode} />}
        />
      </div>
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

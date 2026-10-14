'use client';

import { useActionState } from 'react';
import { Button } from '@careerforge/ui';
import { devSignInAction, type SignInState } from './actions';

export function DevSignInForm({
  redirectUrl,
  mode,
}: {
  redirectUrl: string;
  mode: 'sign-in' | 'sign-up';
}) {
  const [state, action, pending] = useActionState<SignInState, FormData>(devSignInAction, {
    error: null,
  });
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="redirect_url" value={redirectUrl} />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-fg">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          className="h-11 rounded-xl border border-border-strong bg-surface-2 px-3.5 text-sm text-fg transition-shadow outline-none focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_25%,transparent)]"
        />
      </label>
      {mode === 'sign-up' && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg">Name</span>
          <input
            name="name"
            autoComplete="name"
            className="h-11 rounded-xl border border-border-strong bg-surface-2 px-3.5 text-sm text-fg transition-shadow outline-none focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_25%,transparent)]"
          />
        </label>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-tone-error">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? 'Signing in…' : mode === 'sign-up' ? 'Create account' : 'Continue'}
      </Button>
      <p className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-fg-muted">
        Local development sign-in: no password, a signed cookie on this machine. Production uses
        Clerk — set <code className="font-mono">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>.
      </p>
    </form>
  );
}

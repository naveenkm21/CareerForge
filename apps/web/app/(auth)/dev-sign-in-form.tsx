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
          className="h-10 rounded-[6px] border border-border-strong bg-surface px-3 text-sm text-fg outline-none"
        />
      </label>
      {mode === 'sign-up' && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg">Name</span>
          <input
            name="name"
            autoComplete="name"
            className="h-10 rounded-[6px] border border-border-strong bg-surface px-3 text-sm text-fg outline-none"
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
      <p className="rounded-[6px] border border-border bg-surface-2 px-3 py-2 text-xs text-fg-muted">
        Local development sign-in: no password, a signed cookie on this machine. Production uses
        Clerk — set <code className="font-mono">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>.
      </p>
    </form>
  );
}

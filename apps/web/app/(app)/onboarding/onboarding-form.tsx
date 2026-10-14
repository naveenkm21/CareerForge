'use client';

import { useActionState, useEffect, useState } from 'react';
import { DAILY_MINUTE_OPTIONS } from '@careerforge/contracts';
import { Button, cn } from '@careerforge/ui';
import { completeOnboardingAction, type OnboardingState } from './actions';

type Role = { slug: string; title: string; description: string; skillCount: number };

export function OnboardingForm({
  roles,
  defaults,
}: {
  roles: Role[];
  defaults: {
    name: string;
    handle: string;
    roleSlug: string;
    dailyMinutes: number;
    timezone: string | null;
  };
}) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    completeOnboardingAction,
    { errors: {}, formError: null },
  );
  const [role, setRole] = useState(defaults.roleSlug);
  const [minutes, setMinutes] = useState(defaults.dailyMinutes);
  const [timezone, setTimezone] = useState(defaults.timezone ?? 'UTC');

  // Default to the browser's timezone the first time; a returning user keeps theirs.
  useEffect(() => {
    if (!defaults.timezone) setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  }, [defaults.timezone]);

  const err = (k: string) =>
    state.errors[k] ? (
      <p id={`${k}-error`} className="text-sm text-tone-error">
        {state.errors[k]}
      </p>
    ) : null;

  return (
    <form action={action} className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold text-fg">
          1 · What role are you preparing for?
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {roles.map((r) => (
            <label
              key={r.slug}
              className={cn(
                'flex cursor-pointer flex-col gap-1 rounded-[var(--radius)] border bg-surface p-4 transition-colors',
                role === r.slug
                  ? 'border-accent ring-2 ring-accent/30'
                  : 'border-border hover:border-border-strong',
              )}
            >
              <input
                type="radio"
                name="roleSlug"
                value={r.slug}
                checked={role === r.slug}
                onChange={() => setRole(r.slug)}
                className="sr-only"
              />
              <span className="font-semibold text-fg">{r.title}</span>
              <span className="text-sm text-fg-muted">{r.description}</span>
              <span className="mt-1 text-xs text-fg-subtle">{r.skillCount} measured skills</span>
            </label>
          ))}
        </div>
        {err('roleSlug')}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold text-fg">
          2 · How much time can you give it each day?
        </legend>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {DAILY_MINUTE_OPTIONS.map((m) => (
            <label
              key={m}
              className={cn(
                'cursor-pointer rounded-md border px-3.5 py-2 text-sm',
                minutes === m
                  ? 'border-accent bg-accent-soft font-medium text-accent'
                  : 'border-border text-fg-muted hover:text-fg',
              )}
            >
              <input
                type="radio"
                name="dailyMinutes"
                value={m}
                checked={minutes === m}
                onChange={() => setMinutes(m)}
                className="sr-only"
              />
              {m < 60 ? `${m} min` : `${m / 60} h${m % 60 ? ` ${m % 60}m` : ''}`}
            </label>
          ))}
        </div>
        <p className="text-xs text-fg-subtle">
          The planner fits each day to this budget. You can change it later.
        </p>
        {err('dailyMinutes')}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold text-fg sm:col-span-2">3 · About you</legend>
        <Field
          label="Name"
          name="name"
          defaultValue={defaults.name}
          autoComplete="name"
          error={err('name')}
        />
        <Field
          label="Handle"
          name="handle"
          defaultValue={defaults.handle}
          hint="Shown on leaderboards later"
          error={err('handle')}
          prefix="@"
        />
        <Field
          label="Target date (optional)"
          name="targetDate"
          type="date"
          error={err('targetDate')}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg">Timezone</span>
          <input
            name="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-accent"
          />
          {err('timezone')}
        </label>
        <Field label="College (optional)" name="college" error={err('college')} />
        <Field
          label="Graduation year (optional)"
          name="gradYear"
          type="number"
          error={err('gradYear')}
        />
      </fieldset>

      {state.formError && (
        <p role="alert" className="rounded-md bg-tone-error-soft px-3 py-2 text-sm text-tone-error">
          {state.formError}
        </p>
      )}

      <div>
        <Button type="submit" disabled={pending || !role}>
          {pending ? 'Saving…' : 'Build my skill tree'}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  hint,
  prefix,
  ...rest
}: {
  label: string;
  name: string;
  error: React.ReactNode;
  hint?: string;
  prefix?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-fg">{label}</span>
      <span className="flex h-10 items-center rounded-md border border-border bg-surface focus-within:border-accent">
        {prefix && <span className="pl-3 text-sm text-fg-subtle">{prefix}</span>}
        <input
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${name}-error` : undefined}
          className="h-full w-full bg-transparent px-3 text-sm text-fg outline-none"
          {...rest}
        />
      </span>
      {hint && !error && <span className="text-xs text-fg-subtle">{hint}</span>}
      {error}
    </label>
  );
}

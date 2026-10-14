'use client';

import { Button } from '@careerforge/ui';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex max-w-lg flex-col items-start gap-3 px-4 py-20">
      <h1 className="text-3xl font-normal tracking-[-0.021em] text-fg">Something went wrong</h1>
      <p className="text-sm text-fg-muted">
        {error.message.includes('DATABASE_URL')
          ? 'The database is not configured. See README → Local setup.'
          : 'An unexpected error occurred. It has been logged.'}
        {error.digest && (
          <span className="block pt-1 font-mono text-xs text-fg-subtle">ref {error.digest}</span>
        )}
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}

'use client';

import type { Step } from '@careerforge/viz';
import { formatScalar } from '../tones';

/** Variable watch panel. Values that changed since the previous step are emphasised. */
export function VarsPanel({ step, prev }: { step: Step | undefined; prev: Step | undefined }) {
  const entries = Object.entries(step?.vars ?? {});
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface px-3 py-2.5">
      <p className="mb-2 text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">
        Variables
      </p>
      {entries.length === 0 ? (
        <p className="text-xs text-fg-subtle">none yet</p>
      ) : (
        <dl className="flex flex-wrap gap-1.5">
          {entries.map(([k, v]) => {
            const changed =
              prev !== undefined && JSON.stringify(prev.vars[k]) !== JSON.stringify(v);
            return (
              <div
                key={k}
                className="flex items-baseline gap-1.5 rounded-md border px-2 py-1 font-mono text-xs transition-colors"
                style={{
                  borderColor: changed ? 'var(--tone-active)' : 'var(--border)',
                  background: changed ? 'var(--tone-active-soft)' : 'var(--surface-2)',
                }}
              >
                <dt className="text-fg-muted">{k}</dt>
                <dd className="font-semibold text-fg">{formatScalar(v)}</dd>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}

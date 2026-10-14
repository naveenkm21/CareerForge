import { cn } from './cn';

/**
 * A 0..1 bar. `value = null` renders an explicit "not measured" state — the product never shows
 * a fabricated number (docs/08 R7).
 */
export function Meter({
  value,
  target,
  className,
  label,
}: {
  value: number | null;
  target?: number;
  className?: string;
  label: string;
}) {
  const pct = value === null ? 0 : Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value === null ? undefined : pct}
      aria-valuetext={value === null ? 'not measured yet' : `${pct}%`}
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-surface-3', className)}
    >
      {value !== null && (
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 shadow-[0_0_10px_-2px_var(--accent)]"
          style={{ width: `${pct}%` }}
        />
      )}
      {target !== undefined && (
        <div
          className="absolute top-0 h-full w-px bg-fg-subtle"
          style={{ left: `${Math.round(target * 100)}%` }}
          aria-hidden
        />
      )}
    </div>
  );
}

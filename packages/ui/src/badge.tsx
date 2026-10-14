import type { HTMLAttributes } from 'react';
import { cn } from './cn';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-fg-muted border-border',
  accent: 'bg-accent-soft text-accent border-accent/30',
  success: 'bg-tone-found-soft text-tone-found border-tone-found/25',
  warning: 'bg-tone-active-soft text-tone-active border-tone-active/25',
  danger: 'bg-tone-error-soft text-tone-error border-tone-error/25',
};

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

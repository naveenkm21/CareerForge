import type { ReactNode } from 'react';
import { cn } from './cn';

export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-2 rounded-[var(--radius)] border border-dashed border-border-strong bg-surface/40 px-4 py-5',
        className,
      )}
    >
      <p className="text-sm font-medium text-fg">{title}</p>
      {children && <div className="text-sm text-fg-muted">{children}</div>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

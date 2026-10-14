import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'icon';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-fg shadow-[0_0_24px_-8px_var(--accent)] hover:brightness-110 hover:shadow-[0_0_32px_-6px_var(--accent)]',
  secondary:
    'border border-border-strong bg-surface-2 text-fg hover:border-accent/60 hover:text-fg',
  ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg',
  danger: 'bg-danger text-white hover:opacity-90',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  icon: 'h-9 w-9 justify-center',
};

export function buttonClasses(
  variant: Variant = 'primary',
  size: Size = 'md',
  className?: string,
): string {
  return cn(
    'inline-flex items-center rounded-[var(--radius)] font-medium transition-[color,background-color,border-color,box-shadow,filter]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    'disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

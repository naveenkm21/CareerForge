import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'icon';

const VARIANTS: Record<Variant, string> = {
  // The one chromatic fill: signal cyan with ink text (DESIGN.md primary CTA).
  primary:
    'border border-accent-2 bg-accent text-accent-fg shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:brightness-105',
  secondary: 'border border-border text-fg hover:border-border-strong hover:bg-surface',
  ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg',
  danger: 'bg-danger text-white hover:opacity-90',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-sm gap-1.5',
  md: 'h-10 px-5 text-sm gap-2',
  icon: 'h-9 w-9 justify-center',
};

export function buttonClasses(
  variant: Variant = 'primary',
  size: Size = 'md',
  className?: string,
): string {
  return cn(
    'inline-flex items-center rounded-full font-medium transition-[color,background-color,border-color,filter]',
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

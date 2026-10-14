import type { ReactNode } from 'react';

/**
 * Responsive SVG wrapper: fixed viewBox, scales down on narrow screens, never scales up past a
 * comfortable size on wide ones.
 */
export function Svg({
  width,
  height,
  label,
  children,
  maxScale = 1.25,
}: {
  width: number;
  height: number;
  label: string;
  children: ReactNode;
  maxScale?: number;
}) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      style={{
        maxWidth: width * maxScale,
        display: 'block',
        margin: '0 auto',
        overflow: 'visible',
      }}
      role="img"
      aria-label={label}
      className="select-none"
    >
      {children}
    </svg>
  );
}

export const FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/** Shrinks text for long values so cells never overflow. */
export function valueFontSize(text: string, base = 15): number {
  if (text.length <= 3) return base;
  if (text.length <= 5) return base - 3;
  return base - 5;
}

'use client';

import { ThemeProvider as NextThemes } from 'next-themes';

/**
 * Everyone starts in light mode, whatever their operating system prefers; the toggle switches to
 * dark and the choice is remembered. The storage key is new so earlier saved choices (including
 * "system") don't carry over.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="careerforge-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemes>
  );
}

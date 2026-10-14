'use client';

import { usePathname } from 'next/navigation';

/** The landing page (`/`) brings its own dark navigation; every other page gets the app header. */
export function HeaderGate({ children }: { children: React.ReactNode }) {
  return usePathname() === '/' ? null : children;
}

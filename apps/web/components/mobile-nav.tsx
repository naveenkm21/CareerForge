'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';

/** Below the `lg` breakpoint the main links collapse into a disclosure menu. */
export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);
  if (!links.length) return null;
  return (
    <details ref={ref} className="relative lg:hidden">
      <summary
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg"
        aria-label="Menu"
      >
        <Menu size={18} />
      </summary>
      <nav
        aria-label="Main"
        className="absolute top-11 left-0 z-40 flex w-56 flex-col rounded-lg border border-border bg-surface p-1 shadow-xl"
      >
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md px-3 py-2 text-sm ${pathname.startsWith(l.href) ? 'bg-surface-2 font-medium text-fg' : 'text-fg-muted hover:text-fg'}`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </details>
  );
}

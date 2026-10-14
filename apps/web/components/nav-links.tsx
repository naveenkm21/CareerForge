'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@careerforge/ui';

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="ml-2 hidden items-center gap-0.5 lg:flex">
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm transition-colors',
              active ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:text-fg',
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

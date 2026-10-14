import Link from 'next/link';
import { getIdentity } from '@careerforge/auth/server';
import { VendorUserButton } from '@careerforge/auth/react';
import { buttonClasses } from '@careerforge/ui';
import { listAlgorithms } from '@careerforge/viz';
import { signOutAction } from '@/app/(auth)/actions';
import { getActor } from '@/lib/session';
import { CommandPalette } from './command-palette';
import { MobileNav } from './mobile-nav';
import { NavLinks } from './nav-links';
import { ThemeToggle } from './theme-toggle';

export async function SiteHeader() {
  const identity = await getIdentity().catch(() => null);
  const signedIn = identity !== null;
  const algorithms = listAlgorithms().map((a) => ({
    id: a.id,
    title: a.title,
    category: a.categoryLabel,
  }));
  const actor = signedIn ? await getActor().catch(() => null) : null;
  const links = signedIn
    ? [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/learn', label: 'Learn' },
        { href: '/practice', label: 'Practice' },
        { href: '/career', label: 'Career' },
        { href: '/interview', label: 'Interview' },
        { href: '/community', label: 'Community' },
        ...(actor?.role === 'admin' || actor?.role === 'author'
          ? [{ href: '/admin', label: 'Admin' }]
          : []),
      ]
    : [{ href: '/viz', label: 'Visualizer' }];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/60 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link
          href={signedIn ? '/dashboard' : '/'}
          className="flex items-center gap-2 font-display font-bold tracking-tight text-fg"
        >
          <Logo />
          <span>CareerForge</span>
        </Link>
        <NavLinks links={links} />
        <MobileNav links={links} />
        <div className="ml-auto flex items-center gap-1">
          <CommandPalette algorithms={algorithms} signedIn={signedIn} />
          <ThemeToggle />
          {signedIn ? (
            <VendorUserButton
              fallback={
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className={buttonClasses('ghost', 'sm')}
                    title={identity.email ?? undefined}
                  >
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
                      aria-hidden
                    >
                      {(identity.name ?? identity.email ?? '?').slice(0, 1).toUpperCase()}
                    </span>
                    Sign out
                  </button>
                </form>
              }
            />
          ) : (
            <Link href="/sign-in" className={buttonClasses('primary', 'sm')}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id="cf-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#cf-logo)" />
      <path
        d="M7 15.5 L10.5 9 L13.5 13 L17 7.5"
        fill="none"
        stroke="var(--bg)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

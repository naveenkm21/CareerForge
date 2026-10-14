'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Search } from 'lucide-react';
import { Kbd } from '@careerforge/ui';

type Algo = { id: string; title: string; category: string };

const SIGNED_IN_PAGES = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/explain/readiness', label: 'Why is my readiness this number?' },
  { href: '/learn', label: 'Learn — topics & lessons' },
  { href: '/practice', label: 'Practice problems' },
  { href: '/skills', label: 'Skill graph' },
  { href: '/assessment', label: 'Placement assessment' },
  { href: '/career/resume', label: 'Resume analysis' },
  { href: '/career/jobs', label: 'Jobs & skill gaps' },
  { href: '/career/applications', label: 'Application tracker' },
  { href: '/interview', label: 'Mock interview' },
  { href: '/community', label: 'Leaderboard & people' },
  { href: '/community/battles', label: '1v1 battles' },
  { href: '/viz', label: 'Algorithm visualizer' },
  { href: '/settings', label: 'Settings' },
];

const PUBLIC_PAGES = [
  { href: '/', label: 'Home' },
  { href: '/viz', label: 'Algorithm visualizer' },
  { href: '/sign-in', label: 'Sign in' },
];

/** ⌘K / Ctrl+K: jump to any page or any visualization. */
export function CommandPalette({
  algorithms,
  signedIn,
}: {
  algorithms: Algo[];
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const pages = signedIn ? SIGNED_IN_PAGES : PUBLIC_PAGES;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-8 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-xs text-fg-muted transition-colors hover:text-fg md:flex"
      >
        <Search size={13} aria-hidden />
        Search
        <Kbd>Ctrl K</Kbd>
      </button>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command menu"
        overlayClassName="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        contentClassName="fixed top-[15vh] left-1/2 z-50 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
      >
        <Command.Input
          placeholder="Jump to a page or an algorithm…"
          className="h-12 w-full border-b border-border bg-transparent px-4 text-sm text-fg outline-none placeholder:text-fg-subtle"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-fg-muted">
            No results.
          </Command.Empty>
          <Command.Group
            heading="Pages"
            className="text-[11px] text-fg-subtle [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
          >
            {pages.map((p) => (
              <Item key={p.href} onSelect={() => go(p.href)}>
                {p.label}
              </Item>
            ))}
          </Command.Group>
          <Command.Group
            heading="Visualize"
            className="text-[11px] text-fg-subtle [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
          >
            {algorithms.map((a) => (
              <Item
                key={a.id}
                value={`${a.title} ${a.category}`}
                onSelect={() => go(`/viz/${a.id}`)}
              >
                {a.title}
                <span className="ml-auto text-xs text-fg-subtle">{a.category}</span>
              </Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command.Dialog>
    </>
  );
}

function Item({
  children,
  onSelect,
  value,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  value?: string;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-fg data-[selected=true]:bg-surface-2"
    >
      {children}
    </Command.Item>
  );
}

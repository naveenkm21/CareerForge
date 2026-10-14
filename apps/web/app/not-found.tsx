import Link from 'next/link';
import { buttonClasses } from '@careerforge/ui';

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-lg flex-col items-start gap-3 px-4 py-20">
      <p className="font-mono text-sm text-fg-subtle">404</p>
      <h1 className="text-3xl font-normal tracking-[-0.021em] text-fg">This page does not exist</h1>
      <Link href="/viz" className={buttonClasses('secondary', 'sm')}>
        Browse the visualizer
      </Link>
    </main>
  );
}

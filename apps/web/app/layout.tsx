import type { Metadata, Viewport } from 'next';
import { Inter, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import { AuthProvider } from '@careerforge/auth/react';
import { ThemeProvider } from '@/components/theme-provider';
import { HeaderGate } from '@/components/header-gate';
import { SiteHeader } from '@/components/site-header';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans-family', display: 'swap' });
const tight = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-tight-family',
  display: 'swap',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-family',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'CareerForge', template: '%s · CareerForge' },
  description:
    'Learn, practice, track, and prove your job readiness. Code → See → Understand → Solve.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
};

export const viewport: Viewport = {
  // The app opens in light mode for everyone (see ThemeProvider), so the browser chrome matches.
  themeColor: '#fafaf9',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable} ${tight.variable}`}
    >
      <body className="min-h-dvh font-sans">
        <AuthProvider>
          <ThemeProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2"
            >
              Skip to content
            </a>
            <HeaderGate>
              <SiteHeader />
            </HeaderGate>
            <div id="main">{children}</div>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

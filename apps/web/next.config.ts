import { resolve } from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle (`.next/standalone`) for Elastic Beanstalk; opt-in because on
  // Windows it needs symlink rights (Developer Mode). See scripts/package-beanstalk.mjs.
  ...(process.env.NEXT_OUTPUT_STANDALONE === '1' && {
    output: 'standalone' as const,
    // Trace from the monorepo root so workspace packages are included (build runs in apps/web).
    outputFileTracingRoot: resolve(process.cwd(), '../..'),
  }),
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: [
    '@careerforge/ai',
    '@careerforge/auth',
    '@careerforge/content',
    '@careerforge/judge',
    '@careerforge/contracts',
    '@careerforge/core',
    '@careerforge/db',
    '@careerforge/ui',
    '@careerforge/viz',
    '@careerforge/viz-react',
  ],
  // The embedded dev database loads WASM from its own package directory.
  serverExternalPackages: ['@electric-sql/pglite'],
  eslint: { ignoreDuringBuilds: true }, // lint runs once, at the repo root, in CI
  poweredByHeader: false,
};

export default config;

// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/**
 * Architecture rule 2 (docs/01-architecture.md §2): packages/core and packages/viz do zero IO.
 * These are enforced here, not by convention.
 */
const IO_MODULES = [
  'react',
  'react-dom',
  'next',
  'next/*',
  'postgres',
  'drizzle-orm',
  'drizzle-orm/*',
  '@careerforge/db',
  '@careerforge/auth',
  '@careerforge/viz-react',
  'fs',
  'fs/*',
  'node:*',
  'http',
  'https',
  'net',
  'child_process',
];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/.turbo/**',
      'packages/db/drizzle/**',
      'packages/viz/sources/**',
      '**/next-env.d.ts',
      'apps/web/public/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: [
      'apps/web/**/*.{ts,tsx}',
      'packages/viz-react/**/*.{ts,tsx}',
      'packages/ui/**/*.{ts,tsx}',
      'packages/auth/**/*.{ts,tsx}',
    ],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['packages/core/src/**/*.ts', 'packages/viz/src/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: IO_MODULES,
              message:
                'packages/core and packages/viz must stay pure: no IO, no React, no db (ADR rule 2).',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'No IO in pure packages.' },
        { name: 'process', message: 'Pure packages must not read the environment.' },
        { name: 'localStorage', message: 'No IO in pure packages.' },
        { name: 'document', message: 'No DOM in pure packages.' },
        { name: 'window', message: 'No DOM in pure packages.' },
      ],
    },
  },
  {
    // Rule: packages/db is the only place that knows SQL.
    files: ['apps/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['drizzle-orm', 'drizzle-orm/*', 'postgres'],
              message:
                'Apps call repository functions from @careerforge/db; no raw queries in apps.',
            },
          ],
        },
      ],
    },
  },
);

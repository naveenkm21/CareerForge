import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { sql as rawSql } from 'drizzle-orm';
import { drizzle as drizzlePg, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleLite } from 'drizzle-orm/pglite';
import { PGlite, type PGliteOptions } from '@electric-sql/pglite';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Both drivers expose the same Drizzle query builder; the postgres-js type is used as the
 * canonical surface so repositories are written once.
 */
export type Database = PostgresJsDatabase<typeof schema>;

type Cached = { db: Database; close: () => Promise<void>; kind: 'postgres' | 'pglite' };
const globalForDb = globalThis as unknown as { __careerforgeDb?: Cached };

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super('DATABASE_URL is not set. Copy .env.example (see README → Local setup).');
    this.name = 'DatabaseNotConfiguredError';
  }
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * `DATABASE_URL=pglite:<dir>` runs an embedded Postgres (WASM) for zero-dependency local dev
 * and tests. Anything else is a real Postgres URL (Docker locally, Neon in production).
 */
function connect(url: string): Cached {
  if (url.startsWith('pglite:')) {
    const spec = url.slice('pglite:'.length);
    let dir: string | undefined;
    if (spec && spec !== 'memory') {
      dir = isAbsolute(spec) ? spec : resolve(workspaceRoot(), spec);
      mkdirSync(dir, { recursive: true });
    }
    const client = new PGlite(dir, pgliteAssets());
    client.waitReady.catch((err: unknown) => {
      console.error(
        `[db] The embedded database at ${dir ?? 'memory'} failed to start (${(err as Error).message}). ` +
          'This usually follows a hard-killed dev server. Stop the server and run `pnpm db:reset`.',
      );
    });
    const db = drizzleLite(client, { schema, casing: 'snake_case' }) as unknown as Database;
    return { db, kind: 'pglite', close: () => client.close() };
  }
  // `prepare: false` keeps it compatible with Neon's transaction-mode pooler.
  const client = postgres(withoutLibpqOnlyParams(url), {
    max: process.env.NODE_ENV === 'production' ? 5 : 3,
    prepare: false,
  });
  const db = drizzlePg(client, { schema, casing: 'snake_case' });
  return { db, kind: 'postgres', close: () => client.end({ timeout: 5 }) };
}

/**
 * Neon's connection strings carry `channel_binding=require`, a libpq client option. postgres.js
 * forwards unknown query parameters to the server as runtime settings, which fails, so drop it.
 */
function withoutLibpqOnlyParams(url: string): string {
  if (!url.includes('channel_binding=')) return url;
  const parsed = new URL(url);
  parsed.searchParams.delete('channel_binding');
  return parsed.toString();
}

/**
 * Hands PGlite its WASM module and filesystem bundle directly. Its default loader builds a
 * `URL` for the assets, which fails inside Next's server runtime (cross-realm URL class).
 */
function pgliteAssets(): PGliteOptions {
  const dist = findUp(join('node_modules', '@electric-sql', 'pglite', 'dist', 'pglite.wasm'));
  if (!dist) throw new Error('Cannot locate @electric-sql/pglite assets; is it installed?');
  const wasm = (
    globalThis as unknown as { WebAssembly: { Module: new (bytes: Uint8Array) => unknown } }
  ).WebAssembly;
  return {
    wasmModule: new wasm.Module(readFileSync(dist)) as never,
    fsBundle: new Blob([readFileSync(join(dirname(dist), 'pglite.data'))]),
  };
}

/** First existing `<ancestor of cwd>/<rel>`. Plain fs, because bundlers rewrite require(). */
function findUp(rel: string): string | null {
  let dir = process.cwd();
  for (;;) {
    if (existsSync(join(dir, rel))) return join(dir, rel);
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** Relative pglite paths resolve from the monorepo root, whichever package runs them. */
function workspaceRoot(): string {
  const marker = findUp('pnpm-workspace.yaml');
  return marker ? dirname(marker) : process.cwd();
}

/** One client per process, cached on globalThis so Next.js HMR does not leak connections. */
export function getDb(): Database {
  if (globalForDb.__careerforgeDb) return globalForDb.__careerforgeDb.db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new DatabaseNotConfiguredError();
  globalForDb.__careerforgeDb = connect(url);
  return globalForDb.__careerforgeDb.db;
}

export function databaseKind(): 'postgres' | 'pglite' | null {
  getDb();
  return globalForDb.__careerforgeDb?.kind ?? null;
}

export async function closeDb(): Promise<void> {
  const cached = globalForDb.__careerforgeDb;
  if (!cached) return;
  globalForDb.__careerforgeDb = undefined;
  await cached.close();
}

export async function pingDb(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const started = performance.now();
  try {
    await getDb().execute(rawSql`select 1`);
    return { ok: true, latencyMs: Math.round(performance.now() - started) };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - started),
      error: (err as Error).message,
    };
  }
}

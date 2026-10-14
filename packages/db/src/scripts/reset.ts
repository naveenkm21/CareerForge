import { existsSync, renameSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';

/**
 * Local-only recovery for the embedded database. A hard-killed dev server can leave PGlite's
 * files unrecoverable; this moves the directory aside (never deletes it) so `pnpm db:setup`
 * can rebuild from migrations + content. Refuses to touch anything but a pglite: URL.
 */
const url = process.env.DATABASE_URL ?? 'pglite:.data/pg';
if (!url.startsWith('pglite:')) {
  console.error('db:reset only works on the embedded database (DATABASE_URL=pglite:…). Refusing.');
  process.exit(1);
}
const spec = url.slice('pglite:'.length);
if (!spec || spec === 'memory') {
  console.log('In-memory database: nothing to reset.');
  process.exit(0);
}

let root = process.cwd();
while (!existsSync(join(root, 'pnpm-workspace.yaml')) && dirname(root) !== root)
  root = dirname(root);
const dir = isAbsolute(spec) ? spec : resolve(root, spec);

if (!existsSync(dir)) {
  console.log(`No database at ${dir}; nothing to move.`);
} else {
  const aside = `${dir}.broken-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  renameSync(dir, aside);
  console.log(`Moved ${dir} → ${aside}`);
}

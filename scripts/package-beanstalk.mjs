// Builds apps/web as a self-contained Node server and zips it for AWS Elastic Beanstalk
// (platform: Node.js 22 on Amazon Linux 2023). Output: dist/careerforge-beanstalk.zip
//
//   node scripts/package-beanstalk.mjs              app only (point DATABASE_URL at Postgres)
//   node scripts/package-beanstalk.mjs --demo-db    also bundle the seeded demo database
//                                                   (stop `pnpm dev` first so it is not mid-write)
//   … --skip-build                                  repackage the last build without rebuilding
//
// On Windows, Next needs symlink rights for the standalone build: turn on Developer Mode
// (Settings → System → For developers) or run from an administrator terminal.
import { execSync } from 'node:child_process';
import {
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const web = join(root, 'apps', 'web');
const out = join(root, 'dist', 'beanstalk');
const zip = join(root, 'dist', 'careerforge-beanstalk.zip');
const withDemoDb = process.argv.includes('--demo-db');
const standalone = join(web, '.next', 'standalone');

// Build cache, and native binaries for Windows that are useless on the Linux server.
const SKIP = [/[\\/]\.next[\\/]cache$/, /win32/];

/**
 * Copies the standalone tree as real files (zips do not carry symlinks reliably), leaving out
 * every node_modules folder: pnpm's layout depends on symlinks to let a package see its
 * dependencies, so packages are flattened separately by hoistPackages().
 */
function copyTree(src, dest) {
  if (SKIP.some((re) => re.test(src)) || /[\\/]node_modules$/.test(src)) return;
  const st = lstatSync(src);
  if (st.isSymbolicLink()) return copyTree(realpathSync(src), dest);
  if (st.isDirectory()) {
    mkdirSync(dest, { recursive: true });
    for (const entry of readdirSync(src)) copyTree(join(src, entry), join(dest, entry));
    return;
  }
  copyFileSync(src, dest);
}

/**
 * Flattens Next's traced packages (node_modules/.pnpm/<id>/node_modules/<name>) into a single
 * top-level node_modules, the npm layout Node resolves without symlinks. Each package's own
 * folder is the real directory; its siblings are links to other packages and are skipped.
 */
function hoistPackages() {
  const store = join(standalone, 'node_modules', '.pnpm');
  const placed = new Map();
  const place = (dir, name, id) => {
    if (lstatSync(dir).isSymbolicLink() || SKIP.some((re) => re.test(dir))) return;
    if (placed.has(name)) throw new Error(`Two versions of ${name}: ${placed.get(name)}, ${id}`);
    placed.set(name, id);
    cpSync(dir, join(out, 'node_modules', name), { recursive: true, dereference: true });
  };
  for (const id of readdirSync(store)) {
    const nm = join(store, id, 'node_modules');
    if (!existsSync(nm)) continue;
    for (const entry of readdirSync(nm)) {
      if (entry.startsWith('@')) {
        for (const sub of readdirSync(join(nm, entry)))
          place(join(nm, entry, sub), `${entry}/${sub}`, id);
      } else place(join(nm, entry), entry, id);
    }
  }
  return placed.size;
}

const run = (cmd, env = {}) =>
  execSync(cmd, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } });

if (process.argv.includes('--skip-build')) {
  if (!existsSync(standalone))
    throw new Error('No standalone build yet; run without --skip-build.');
  console.log('1/4 Reusing the existing standalone build');
} else {
  console.log('1/4 Building apps/web (standalone)…');
  run('pnpm turbo run build --filter=@careerforge/web --force', {
    NEXT_OUTPUT_STANDALONE: '1',
    NODE_ENV: 'production',
  });
}

console.log('2/4 Assembling bundle…');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
copyTree(standalone, out);
console.log(`    ${hoistPackages()} packages flattened into node_modules`);
// Next leaves static assets and public/ out of the standalone folder by design.
cpSync(join(web, '.next', 'static'), join(out, 'apps', 'web', '.next', 'static'), {
  recursive: true,
});
cpSync(join(web, 'public'), join(out, 'apps', 'web', 'public'), { recursive: true });
// The DB client locates PGlite's WASM by walking up from the working directory (the bundle
// root), and the tracer may omit the .wasm/.data files — ship the whole package at the root.
cpSync(
  realpathSync(join(web, 'node_modules', '@electric-sql', 'pglite')),
  join(out, 'node_modules', '@electric-sql', 'pglite'),
  { recursive: true, dereference: true },
);

if (withDemoDb) {
  const db = join(root, '.data', 'pg');
  if (!existsSync(db)) throw new Error('No demo database. Run `pnpm db:reset && pnpm db:demo`.');
  cpSync(db, join(out, '.data', 'pg'), { recursive: true });
}

console.log('3/4 Writing Beanstalk entry files…');
// No dependencies: Beanstalk's `npm install` becomes a no-op; everything is already bundled.
writeFileSync(
  join(out, 'package.json'),
  JSON.stringify(
    {
      name: 'careerforge-web',
      private: true,
      engines: { node: '>=22' },
      scripts: { start: 'node start.cjs' },
    },
    null,
    2,
  ) + '\n',
);
writeFileSync(join(out, 'Procfile'), 'web: node start.cjs\n');
writeFileSync(
  join(out, 'start.cjs'),
  `// Beanstalk's proxy forwards to PORT (8080); listen on all interfaces.
process.env.HOSTNAME = '0.0.0.0';
process.env.PORT = process.env.PORT || '8080';
// Next's server.js changes into apps/web, so make a relative embedded-database path
// (DATABASE_URL=pglite:.data/pg) absolute against this bundle's root first.
const path = require('node:path');
const url = process.env.DATABASE_URL || '';
if (url.startsWith('pglite:')) {
  const dir = url.slice('pglite:'.length);
  if (dir && dir !== 'memory' && !path.isAbsolute(dir))
    process.env.DATABASE_URL = 'pglite:' + path.resolve(__dirname, dir);
}
require('./apps/web/server.js');
`,
);

console.log('4/4 Zipping…');
rmSync(zip, { force: true });
// bsdtar (built into Windows 10+) writes forward-slash paths, which Linux unzips correctly.
// Entries are listed explicitly so dot-folders (.data) are included.
const entries = readdirSync(out)
  .map((e) => `"${e}"`)
  .join(' ');
// Use Windows' own bsdtar: a GNU tar earlier on PATH (Git Bash) misreads `E:\…` as a host.
const winTar = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe');
const tar = process.platform === 'win32' && existsSync(winTar) ? `"${winTar}"` : 'tar';
execSync(`${tar} -a -c -f "${zip}" ${entries}`, { cwd: out, stdio: 'inherit' });
const mb = (statSync(zip).size / 1024 / 1024).toFixed(1);
console.log(
  `\nDone: dist/careerforge-beanstalk.zip (${mb} MB)${withDemoDb ? ' — includes demo database' : ''}`,
);

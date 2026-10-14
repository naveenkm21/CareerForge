// Serves Monaco from /monaco/vs instead of a CDN, so the editor works offline (demo safety).
import { cpSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const src = join(dirname(require.resolve('monaco-editor/package.json')), 'min', 'vs');
const dest = join(process.cwd(), 'public', 'monaco', 'vs');
if (!existsSync(join(dest, 'loader.js'))) {
  cpSync(src, dest, { recursive: true });
  console.log('copied monaco-editor → public/monaco/vs');
}

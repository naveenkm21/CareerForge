import type { Lang } from './types';

/** Matches a trailing anchor-only comment: `// @a @b` or `# @a`. */
const ANCHOR_COMMENT: Record<Lang, RegExp> = {
  cpp: /\s*\/\/((?:\s*@[A-Za-z][\w-]*)+)\s*$/,
  java: /\s*\/\/((?:\s*@[A-Za-z][\w-]*)+)\s*$/,
  ts: /\s*\/\/((?:\s*@[A-Za-z][\w-]*)+)\s*$/,
  python: /\s*#((?:\s*@[A-Za-z][\w-]*)+)\s*$/,
};

/**
 * Strips anchor comments and indexes anchor → 1-based line numbers. An anchor may label several
 * lines (all are highlighted). Anchors on otherwise-blank lines are rejected: an anchor must
 * point at code.
 */
export function extractAnchors(
  raw: string,
  lang: Lang,
): { code: string; anchors: Record<string, number[]> } {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\t/g, '    ').split('\n');
  while (lines.length && lines[lines.length - 1]!.trim() === '') lines.pop();
  const anchors: Record<string, number[]> = {};
  const out = lines.map((line, idx) => {
    const m = ANCHOR_COMMENT[lang].exec(line);
    if (!m) return line.replace(/\s+$/, '');
    const code = line.slice(0, m.index).replace(/\s+$/, '');
    if (code.trim() === '') throw new Error(`line ${idx + 1}: anchor comment on a blank line`);
    for (const name of m[1]!
      .trim()
      .split(/\s+/)
      .map((s) => s.slice(1))) {
      (anchors[name] ??= []).push(idx + 1);
    }
    return code;
  });
  return { code: out.join('\n'), anchors };
}

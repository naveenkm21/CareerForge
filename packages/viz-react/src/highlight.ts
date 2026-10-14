import type { Lang } from '@careerforge/viz';

/**
 * A deliberately small line tokenizer for the four display languages. The reference sources are
 * short and curated, so this covers them without shipping a grammar engine to the browser.
 */
export type TokenKind = 'kw' | 'type' | 'str' | 'num' | 'com' | 'fn' | 'plain';
export type Token = { kind: TokenKind; text: string };

const KEYWORDS: Record<Lang, Set<string>> = {
  cpp: new Set(
    'auto bool break case char class const continue default delete do double else enum false for if int long new nullptr return size_t static struct switch this true unsigned using void while'.split(
      ' ',
    ),
  ),
  java: new Set(
    'boolean break case char class continue default do double else extends false final for if int long new null private protected public return static this true void while'.split(
      ' ',
    ),
  ),
  python: new Set(
    'and as break class continue def del elif else False for from if import in is lambda None not or pass return True while with yield'.split(
      ' ',
    ),
  ),
  ts: new Set(
    'as break case const continue default do else export false for function if in let new null of return this true type undefined void while'.split(
      ' ',
    ),
  ),
};

const TYPES =
  /^(vector|pair|queue|stack|priority_queue|unordered_map|string|Node|Map|Set|List|ArrayList|Deque|ArrayDeque|PriorityQueue|Integer|Character|Arrays|Collections|MinHeap|Array|Record|INT_MAX|Infinity|number|string|boolean|greater|deque|heapq|float|len|range|min|max|set|int)$/;

const TOKEN_RE =
  /(\s+)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\d+(?:\.\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|(.)/g;

export function tokenizeLine(line: string, lang: Lang): Token[] {
  const commentAt = findComment(line, lang);
  const code = commentAt >= 0 ? line.slice(0, commentAt) : line;
  const tokens: Token[] = [];
  const push = (kind: TokenKind, text: string) => {
    const last = tokens[tokens.length - 1];
    if (last && last.kind === kind && kind === 'plain') last.text += text;
    else tokens.push({ kind, text });
  };
  for (const m of code.matchAll(TOKEN_RE)) {
    const [text, ws, str, num, ident] = m;
    if (ws) push('plain', text);
    else if (str) push('str', text);
    else if (num) push('num', text);
    else if (ident) {
      const next = code.slice((m.index ?? 0) + text.length).trimStart();
      if (KEYWORDS[lang].has(ident)) push('kw', text);
      else if (TYPES.test(ident)) push('type', text);
      else if (next.startsWith('(')) push('fn', text);
      else push('plain', text);
    } else push('plain', text);
  }
  if (commentAt >= 0) tokens.push({ kind: 'com', text: line.slice(commentAt) });
  return tokens;
}

/** Index of a line comment outside string literals, or -1. */
function findComment(line: string, lang: Lang): number {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (lang === 'python' ? c === '#' : c === '/' && line[i + 1] === '/') return i;
  }
  return -1;
}

export const TOKEN_COLORS: Record<TokenKind, string | undefined> = {
  kw: 'var(--syn-keyword)',
  type: 'var(--syn-type)',
  str: 'var(--syn-string)',
  num: 'var(--syn-number)',
  com: 'var(--syn-comment)',
  fn: undefined,
  plain: undefined,
};

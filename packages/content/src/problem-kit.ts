/**
 * Problem authoring kit. Every problem is stdin → stdout so one judge serves every language.
 * Expected outputs are COMPUTED from a TypeScript reference (`solve`), never typed by hand, so a
 * testcase can't silently disagree with the answer.
 */

export type ProblemDef = {
  slug: string;
  title: string;
  skill: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  hints: string[];
  algorithmId?: string;
  tags: string[];
  samples: string[];
  /** Deterministic hidden-case generator. */
  generate: (rnd: Rng) => string;
  hiddenCount?: number;
  solve: (input: string) => string;
  /** Editorial solution in C++ (the curriculum language). */
  cpp: string;
};

export type Rng = {
  int: (lo: number, hi: number) => number;
  pick: <T>(xs: readonly T[]) => T;
  array: (n: number, lo: number, hi: number) => number[];
};

export function rng(seedText: string): Rng {
  let s = 2166136261;
  for (let i = 0; i < seedText.length; i++)
    s = Math.imul(s ^ seedText.charCodeAt(i), 16777619) >>> 0;
  const next = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  return {
    int,
    pick: (xs) => xs[int(0, xs.length - 1)]!,
    array: (n, lo, hi) => Array.from({ length: n }, () => int(lo, hi)),
  };
}

export type Testcase = { input: string; expected: string; isSample: boolean };

export function testcasesFor(p: ProblemDef): Testcase[] {
  const r = rng(p.slug);
  const hidden = Array.from({ length: p.hiddenCount ?? 8 }, () => p.generate(r));
  return [
    ...p.samples.map((input) => ({ input, expected: p.solve(input), isSample: true })),
    ...hidden.map((input) => ({ input, expected: p.solve(input), isSample: false })),
  ];
}

/** Whitespace-normalized comparison used by every judge. */
export function outputsMatch(actual: string, expected: string): boolean {
  const norm = (s: string) =>
    s
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((l) => l.trimEnd())
      .join('\n')
      .trim();
  return norm(actual) === norm(expected);
}

// ── Input helpers ─────────────────────────────────────────────────────────────

export const ints = (s: string) => s.trim().split(/\s+/).filter(Boolean).map(Number);
export const lines = (s: string) => s.replace(/\r\n/g, '\n').trim().split('\n');
export const arr = (xs: number[]) => xs.join(' ');

export const STARTERS = (
  p: Pick<ProblemDef, 'inputFormat' | 'outputFormat'>,
): Record<string, string> => {
  const comment = (prefix: string) =>
    [
      `${prefix} Input:  ${p.inputFormat.replace(/\n/g, ' ')}`,
      `${prefix} Output: ${p.outputFormat.replace(/\n/g, ' ')}`,
    ].join('\n');
  return {
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\n${comment('//')}\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    return 0;\n}\n`,
    python: `import sys\n\n${comment('#')}\ndef main():\n    data = sys.stdin.read().split()\n\n\nmain()\n`,
    java: `import java.util.*;\nimport java.io.*;\n\n${comment('//')}\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));\n\n    }\n}\n`,
    javascript: `${comment('//')}\nconst data = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/);\n\n`,
  };
};

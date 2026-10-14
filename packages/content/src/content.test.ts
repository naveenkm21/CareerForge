import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  INTERVIEW_QUESTIONS,
  INTERVIEW_ROUNDS,
  JOBS,
  outputsMatch,
  PROBLEMS,
  QUESTIONS,
  testcasesFor,
  TOPICS,
} from './index';

describe('problems', () => {
  it('have unique slugs, samples, and deterministic testcases', () => {
    expect(new Set(PROBLEMS.map((p) => p.slug)).size).toBe(PROBLEMS.length);
    for (const p of PROBLEMS) {
      expect(p.samples.length, p.slug).toBeGreaterThan(0);
      const a = testcasesFor(p);
      expect(testcasesFor(p), p.slug).toEqual(a);
      expect(a.length).toBeGreaterThanOrEqual(p.samples.length + 1);
      for (const tc of a)
        expect(tc.expected.length, `${p.slug}: empty expected`).toBeGreaterThan(0);
    }
  });

  it('known sample answers', () => {
    const answer = (slug: string, i = 0) =>
      testcasesFor(PROBLEMS.find((p) => p.slug === slug)!)[i]!.expected;
    expect(answer('array-sum')).toBe('15');
    expect(answer('pair-sum-sorted')).toBe('YES');
    expect(answer('pair-sum-sorted', 1)).toBe('NO');
    expect(answer('longest-unique-substring')).toBe('3');
    expect(answer('min-coins')).toBe('2');
    expect(answer('dijkstra-distances')).toBe('0 3 2 8 11');
    expect(answer('number-of-islands')).toBe('3');
    expect(answer('course-schedule', 1)).toBe('NO');
  });

  it('output comparison ignores trailing whitespace and CRLF', () => {
    expect(outputsMatch('1 2 3 \r\n', '1 2 3')).toBe(true);
    expect(outputsMatch('1 2', '1 2 3')).toBe(false);
  });
});

const hasGpp = spawnSync('g++', ['--version']).status === 0;

const run = promisify(execFile);

/** Async so the vitest worker's event loop never blocks on a compile. */
async function runWithInput(exe: string, input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(exe, { timeout: 5000 }, (err, stdout) =>
      err ? reject(err) : resolve(stdout),
    );
    child.stdin?.end(input);
  });
}

describe.skipIf(!hasGpp)('C++ editorial solutions pass their own judges', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cf-ref-'));
  it.each(PROBLEMS.map((p) => [p.slug, p] as const))(
    '%s',
    async (slug, p) => {
      const src = join(dir, `${slug}.cpp`);
      const exe = join(dir, `${slug}.exe`);
      writeFileSync(src, p.cpp);
      await run('g++', ['-O2', '-std=c++17', '-o', exe, src]);
      for (const tc of testcasesFor(p)) {
        const out = await runWithInput(exe, tc.input);
        expect(
          outputsMatch(out, tc.expected),
          `${slug} input:
${tc.input}
expected ${tc.expected}
got ${out}`,
        ).toBe(true);
      }
    },
    60_000,
  );
});

describe('questions, topics, jobs, interviews', () => {
  it('questions are well-formed', () => {
    expect(new Set(QUESTIONS.map((q) => q.slug)).size).toBe(QUESTIONS.length);
    for (const q of QUESTIONS) expect(q.options, q.slug).toContain(q.answer);
    expect(QUESTIONS.filter((q) => q.placement).length).toBeGreaterThanOrEqual(8);
  });

  it('topics reference real problems and questions, and follow the ladder', () => {
    const problems = new Set(PROBLEMS.map((p) => p.slug));
    const questions = new Set(QUESTIONS.map((q) => q.slug));
    expect(new Set(TOPICS.map((t) => t.slug)).size).toBe(TOPICS.length);
    for (const t of TOPICS) {
      const stages = t.lessons.map((l) => l.stage);
      expect(
        [...stages].sort((a, b) => a - b),
        t.slug,
      ).toEqual(stages);
      for (const l of t.lessons)
        for (const b of l.blocks) {
          if (b.kind === 'problem')
            expect(problems.has(b.problemSlug), `${t.slug}: ${b.problemSlug}`).toBe(true);
          if (b.kind === 'quiz')
            expect(questions.has(b.questionSlug), `${t.slug}: ${b.questionSlug}`).toBe(true);
        }
    }
    expect(TOPICS.filter((t) => t.lessons.length === 8).length).toBeGreaterThanOrEqual(3);
  });

  it('jobs and interview rounds are complete', () => {
    expect(new Set(JOBS.map((j) => j.externalId)).size).toBe(JOBS.length);
    for (const rounds of Object.values(INTERVIEW_ROUNDS))
      for (const r of rounds) expect(INTERVIEW_QUESTIONS.some((q) => q.kind === r.kind)).toBe(true);
  });
});

import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { judge } from './index';

const cases = [
  { id: '1', input: '3\n1 2 3', expected: '6' },
  { id: '2', input: '2\n-5 5', expected: '0' },
];

describe('judge provider selection', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('refuses to run without a configured judge', async () => {
    vi.stubEnv('JUDGE_PROVIDER', '');
    vi.stubEnv('JUDGE0_URL', '');
    vi.stubEnv('OPENROUTER_API_KEY', '');
    const r = await judge({ lang: 'javascript', code: '', cases, timeLimitMs: 1000 });
    expect(r.status).toBe('error');
  });
  it('never runs the local judge in production', async () => {
    vi.stubEnv('JUDGE_PROVIDER', 'local');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JUDGE0_URL', '');
    expect((await judge({ lang: 'javascript', code: '', cases, timeLimitMs: 1000 })).status).toBe(
      'error',
    );
  });
});

describe('local judge', () => {
  beforeEach(() => {
    vi.stubEnv('JUDGE_PROVIDER', 'local');
    vi.stubEnv('JUDGE0_URL', '');
  });
  afterEach(() => vi.unstubAllEnvs());

  const sumJs = `const d=require('fs').readFileSync(0,'utf8').trim().split(/\\s+/).map(Number);console.log(d.slice(1).reduce((a,b)=>a+b,0));`;

  it('accepts a correct solution', async () => {
    expect(
      await judge({ lang: 'javascript', code: sumJs, cases, timeLimitMs: 2000 }),
    ).toMatchObject({ status: 'ac', passed: 2, total: 2 });
  });

  it('reports wrong answer with the failing case', async () => {
    const r = await judge({ lang: 'javascript', code: `console.log(6)`, cases, timeLimitMs: 2000 });
    expect(r).toMatchObject({ status: 'wa', passed: 1 });
    expect(r.failedCase).toMatchObject({ expected: '0', actual: '6\n' });
  });

  it('enforces the time limit', async () => {
    const r = await judge({ lang: 'javascript', code: `while(true){}`, cases, timeLimitMs: 200 });
    expect(r.status).toBe('tle');
  }, 15_000);

  it('reports runtime errors', async () => {
    expect(
      (await judge({ lang: 'javascript', code: `throw new Error('x')`, cases, timeLimitMs: 2000 }))
        .status,
    ).toBe('re');
  });

  it.skipIf(spawnSync('g++', ['--version']).status !== 0)(
    'compiles C++ and reports compile errors',
    async () => {
      const ok = `#include <bits/stdc++.h>\nint main(){int n;long long s=0,x;std::cin>>n;while(n--){std::cin>>x;s+=x;}std::cout<<s;}`;
      expect((await judge({ lang: 'cpp', code: ok, cases, timeLimitMs: 2000 })).status).toBe('ac');
      expect(
        (await judge({ lang: 'cpp', code: 'int main( {', cases, timeLimitMs: 2000 })).status,
      ).toBe('ce');
    },
    60_000,
  );
});

describe('AI review (OpenRouter)', () => {
  beforeEach(() => {
    vi.stubEnv('JUDGE_PROVIDER', '');
    vi.stubEnv('JUDGE0_URL', '');
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  /** Fakes OpenRouter: answers with `answer` as the model's JSON content. */
  function fakeModel(answer: unknown, status = 200) {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            model: 'test/model:free',
            choices: [{ message: { content: JSON.stringify(answer) } }],
          }),
          { status },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }
  const review = () =>
    judge({
      lang: 'python',
      code: 'print(sum(map(int, input().split()[1:])))',
      cases,
      timeLimitMs: 1000,
      problem: { title: 'Sum', statement: 'Print the sum.' },
    });
  const base = {
    compiles: true,
    compile_error: '',
    likely_too_slow: false,
    feedback: 'Looks right.',
  };

  it('is used when only an OpenRouter key is configured', async () => {
    const fetchMock = fakeModel({
      ...base,
      cases: cases.map((c) => ({
        id: c.id,
        passes: true,
        predicted_output: c.expected,
        reason: 'ok',
      })),
    });
    const r = await review();
    expect(r).toMatchObject({ status: 'ac', passed: 2, total: 2, judge: 'ai:test/model:free' });
    expect(r.message).toContain('not executed');
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body.messages[1].content).toContain('Print the sum.');
  });

  it('code counts the passes: one failing test is a wrong answer with the predicted output', async () => {
    fakeModel({
      ...base,
      cases: [
        { id: '1', passes: true, predicted_output: '6', reason: 'ok' },
        { id: '2', passes: false, predicted_output: '-10', reason: 'reads the count as a value' },
      ],
    });
    const r = await review();
    expect(r).toMatchObject({ status: 'wa', passed: 1, total: 2 });
    expect(r.failedCase).toMatchObject({ input: cases[1]!.input, actual: '-10' });
  });

  it('a test the model skipped is never assumed to pass', async () => {
    fakeModel({ ...base, cases: [{ id: '1', passes: true, predicted_output: '6', reason: '' }] });
    expect(await review()).toMatchObject({ status: 'wa', passed: 1 });
  });

  it('maps "would not compile" and "too slow"', async () => {
    fakeModel({ ...base, compiles: false, compile_error: 'SyntaxError', cases: [] });
    expect((await review()).status).toBe('ce');
    fakeModel({
      ...base,
      likely_too_slow: true,
      cases: cases.map((c) => ({
        id: c.id,
        passes: true,
        predicted_output: c.expected,
        reason: '',
      })),
    });
    expect((await review()).status).toBe('tle');
  });

  it('rate limits and unreadable answers become errors, never verdicts', async () => {
    fakeModel({}, 429);
    expect(await review()).toMatchObject({ status: 'error' });
    fakeModel('not json at all');
    expect(await review()).toMatchObject({ status: 'error' });
  });
});

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

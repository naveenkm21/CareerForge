import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { outputsMatch } from '@careerforge/content';
import { judgeAi, type AiProblem } from './ai';

export { aiModels } from './ai';

/**
 * The code judge (docs/05 §4). One interface, three backends:
 *
 *   judge0 — production. Judge0 CE in isolated Docker with no network (ADR-010).
 *   ai     — when no runner exists: an OpenRouter model reviews the code against the tests
 *            (OPENROUTER_API_KEY). Nothing is executed; verdicts are labelled and their
 *            evidence is discounted.
 *   local  — development/demo ONLY. Runs the toolchains installed on this machine with time
 *            limits. It is NOT a sandbox, so it refuses to run unless JUDGE_PROVIDER=local is
 *            set explicitly, and never when NODE_ENV=production.
 */

export type JudgeLang = 'cpp' | 'python' | 'java' | 'javascript';
export const JUDGE_LANGS: JudgeLang[] = ['cpp', 'python', 'java', 'javascript'];
export const JUDGE_LANG_LABELS: Record<JudgeLang, string> = {
  cpp: 'C++17',
  python: 'Python 3',
  java: 'Java',
  javascript: 'JavaScript (Node)',
};

export type JudgeCase = { id: string; input: string; expected: string };
export type Verdict = 'ac' | 'wa' | 'tle' | 're' | 'ce' | 'error';
export type JudgeResult = {
  status: Verdict;
  passed: number;
  total: number;
  runtimeMs: number | null;
  failedCase: { input: string; expected: string; actual: string; stderr?: string } | null;
  judge: string;
  message?: string;
};

export function judgeProvider(): 'judge0' | 'local' | 'ai' | 'none' {
  if (process.env.JUDGE0_URL) return 'judge0';
  if (process.env.JUDGE_PROVIDER === 'local' && process.env.NODE_ENV !== 'production')
    return 'local';
  if (process.env.OPENROUTER_API_KEY) return 'ai';
  return 'none';
}

const MAX_CODE = 64 * 1024;
const MAX_OUTPUT = 64 * 1024;

export async function judge(input: {
  lang: JudgeLang;
  code: string;
  cases: JudgeCase[];
  timeLimitMs: number;
  /** Only the AI reviewer reads it; the runners judge by output alone. */
  problem?: AiProblem;
}): Promise<JudgeResult> {
  if (input.code.length > MAX_CODE)
    return {
      status: 'error',
      passed: 0,
      total: input.cases.length,
      runtimeMs: null,
      failedCase: null,
      judge: 'none',
      message: 'Code is larger than 64 KB.',
    };
  const provider = judgeProvider();
  if (provider === 'judge0') return judge0(input);
  if (provider === 'local') return judgeLocal(input);
  if (provider === 'ai') return judgeAi(input);
  return {
    status: 'error',
    passed: 0,
    total: input.cases.length,
    runtimeMs: null,
    failedCase: null,
    judge: 'none',
    message:
      'No judge is configured. Set OPENROUTER_API_KEY (AI review), JUDGE0_URL, or JUDGE_PROVIDER=local (local development).',
  };
}

// ── Local runner (development only) ──────────────────────────────────────────

type RunOut = {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  ms: number;
};

function run(
  cmd: string,
  args: string[],
  stdin: string,
  timeoutMs: number,
  cwd: string,
): Promise<RunOut> {
  return new Promise((resolve) => {
    const started = performance.now();
    const child = spawn(cmd, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);
    child.stdout.on('data', (d: Buffer) => {
      if (stdout.length < MAX_OUTPUT) stdout += d.toString();
    });
    child.stderr.on('data', (d: Buffer) => {
      if (stderr.length < MAX_OUTPUT) stderr += d.toString();
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        code: -1,
        stdout,
        stderr: `${stderr}${err.message}`,
        timedOut,
        ms: performance.now() - started,
      });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut, ms: performance.now() - started });
    });
    child.stdin.on('error', () => {});
    child.stdin.end(stdin);
  });
}

const exe = process.platform === 'win32' ? 'main.exe' : 'main';
const pythonCmd = () => (spawnSync('python3', ['--version']).status === 0 ? 'python3' : 'python');

async function judgeLocal(input: {
  lang: JudgeLang;
  code: string;
  cases: JudgeCase[];
  timeLimitMs: number;
}): Promise<JudgeResult> {
  const dir = mkdtempSync(join(tmpdir(), 'cf-judge-'));
  const total = input.cases.length;
  const base = { passed: 0, total, judge: 'local' };
  try {
    let cmd: string;
    let args: string[];
    if (input.lang === 'cpp') {
      writeFileSync(join(dir, 'main.cpp'), input.code);
      const c = await run('g++', ['-O2', '-std=c++17', '-o', exe, 'main.cpp'], '', 30_000, dir);
      if (c.code !== 0)
        return {
          ...base,
          status: 'ce',
          runtimeMs: null,
          failedCase: null,
          message: c.stderr.slice(0, 4000),
        };
      cmd = join(dir, exe);
      args = [];
    } else if (input.lang === 'java') {
      writeFileSync(join(dir, 'Main.java'), input.code);
      const c = await run('javac', ['Main.java'], '', 30_000, dir);
      if (c.code !== 0)
        return {
          ...base,
          status: 'ce',
          runtimeMs: null,
          failedCase: null,
          message: c.stderr.slice(0, 4000),
        };
      cmd = 'java';
      args = ['-Xss64m', '-cp', dir, 'Main'];
    } else if (input.lang === 'python') {
      writeFileSync(join(dir, 'main.py'), input.code);
      cmd = pythonCmd();
      args = ['main.py'];
    } else {
      writeFileSync(join(dir, 'main.js'), input.code);
      cmd = process.execPath;
      args = ['main.js'];
    }

    // Interpreted languages and the JVM get extra headroom, as most judges do.
    const limit = input.timeLimitMs * (input.lang === 'cpp' ? 1 : input.lang === 'java' ? 2.5 : 3);
    let passed = 0;
    let slowest = 0;
    for (const tc of input.cases) {
      const r = await run(cmd, args, tc.input, limit + 500, dir);
      slowest = Math.max(slowest, r.ms);
      if (r.timedOut || r.ms > limit)
        return {
          ...base,
          passed,
          status: 'tle',
          runtimeMs: Math.round(r.ms),
          failedCase: { input: tc.input, expected: tc.expected, actual: '(time limit exceeded)' },
        };
      if (r.code !== 0)
        return {
          ...base,
          passed,
          status: 're',
          runtimeMs: Math.round(r.ms),
          failedCase: {
            input: tc.input,
            expected: tc.expected,
            actual: r.stdout.slice(0, 2000),
            stderr: r.stderr.slice(0, 2000),
          },
        };
      if (!outputsMatch(r.stdout, tc.expected))
        return {
          ...base,
          passed,
          status: 'wa',
          runtimeMs: Math.round(r.ms),
          failedCase: { input: tc.input, expected: tc.expected, actual: r.stdout.slice(0, 2000) },
        };
      passed++;
    }
    return { ...base, passed, status: 'ac', runtimeMs: Math.round(slowest), failedCase: null };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ── Judge0 (production) ──────────────────────────────────────────────────────

const JUDGE0_LANGUAGE: Record<JudgeLang, number> = {
  cpp: 54,
  python: 71,
  java: 62,
  javascript: 63,
};

async function judge0(input: {
  lang: JudgeLang;
  code: string;
  cases: JudgeCase[];
  timeLimitMs: number;
}): Promise<JudgeResult> {
  const base = `${process.env.JUDGE0_URL!.replace(/\/$/, '')}/submissions?base64_encoded=false&wait=true`;
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (process.env.JUDGE0_TOKEN) headers['x-auth-token'] = process.env.JUDGE0_TOKEN;
  let passed = 0;
  let slowest = 0;
  for (const tc of input.cases) {
    const res = await fetch(base, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        language_id: JUDGE0_LANGUAGE[input.lang],
        source_code: input.code,
        stdin: tc.input,
        cpu_time_limit: input.timeLimitMs / 1000,
        memory_limit: 262_144,
      }),
    });
    if (!res.ok)
      return {
        status: 'error',
        passed,
        total: input.cases.length,
        runtimeMs: null,
        failedCase: null,
        judge: 'judge0',
        message: `Judge unavailable (${res.status})`,
      };
    const r = (await res.json()) as {
      status: { id: number };
      stdout: string | null;
      stderr: string | null;
      compile_output: string | null;
      time: string | null;
    };
    slowest = Math.max(slowest, Number(r.time ?? 0) * 1000);
    const fail = (status: Verdict, actual: string) => ({
      status,
      passed,
      total: input.cases.length,
      runtimeMs: Math.round(slowest),
      failedCase: { input: tc.input, expected: tc.expected, actual, stderr: r.stderr ?? undefined },
      judge: 'judge0',
    });
    if (r.status.id === 6)
      return {
        status: 'ce',
        passed,
        total: input.cases.length,
        runtimeMs: null,
        failedCase: null,
        judge: 'judge0',
        message: r.compile_output ?? '',
      };
    if (r.status.id === 5) return fail('tle', '(time limit exceeded)');
    if (r.status.id >= 7) return fail('re', r.stdout ?? '');
    if (!outputsMatch(r.stdout ?? '', tc.expected)) return fail('wa', r.stdout ?? '');
    passed++;
  }
  return {
    status: 'ac',
    passed,
    total: input.cases.length,
    runtimeMs: Math.round(slowest),
    failedCase: null,
    judge: 'judge0',
  };
}

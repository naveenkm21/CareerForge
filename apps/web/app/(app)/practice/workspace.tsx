'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { BookOpen, Lightbulb, Play, Send } from 'lucide-react';
import { Badge, Button, cn } from '@careerforge/ui';
import { runSamplesAction, submitAction, type RunResponse } from './actions';

// Monaco never lands in the initial bundle (docs/01 §4), and loads from /monaco/vs, not a CDN.
const Editor = dynamic(
  async () => {
    const mod = await import('@monaco-editor/react');
    mod.loader.config({ paths: { vs: '/monaco/vs' } });
    return mod.default;
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-fg-subtle">
        Loading editor…
      </div>
    ),
  },
);

const LANGS = [
  { id: 'cpp', label: 'C++17', monaco: 'cpp' },
  { id: 'python', label: 'Python 3', monaco: 'python' },
  { id: 'java', label: 'Java', monaco: 'java' },
  { id: 'javascript', label: 'JavaScript', monaco: 'javascript' },
] as const;

const VERDICT: Record<
  string,
  { label: string; tone: 'success' | 'danger' | 'warning' | 'neutral' }
> = {
  ac: { label: 'Accepted', tone: 'success' },
  wa: { label: 'Wrong answer', tone: 'danger' },
  tle: { label: 'Time limit exceeded', tone: 'warning' },
  re: { label: 'Runtime error', tone: 'danger' },
  ce: { label: 'Compilation error', tone: 'danger' },
  error: { label: 'Judge unavailable', tone: 'neutral' },
};

export function Workspace({
  slug,
  starter,
  hints,
  editorial,
  battleId,
  preferredLang,
}: {
  slug: string;
  starter: Record<string, string>;
  hints: string[];
  editorial: string | null;
  battleId: string | null;
  preferredLang: string;
}) {
  const { resolvedTheme } = useTheme();
  const initialLang = LANGS.some((l) => l.id === preferredLang) ? preferredLang : 'cpp';
  const [lang, setLang] = useState<string>(initialLang);
  const [code, setCode] = useState<string>(starter[initialLang] ?? '');
  const [result, setResult] = useState<{ kind: 'run' | 'submit'; r: RunResponse } | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [showEditorial, setShowEditorial] = useState(false);
  const [pending, start] = useTransition();
  const draftKey = (l: string) => `cf-draft:${slug}:${l}`;

  // Local draft persistence (a per-viewer convenience — never the source of truth).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey(initialLang));
      if (saved) setCode(saved);
    } catch {
      // Storage can be unavailable (private mode); drafts are a convenience only.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(draftKey(lang), code);
    } catch {
      // Storage can be unavailable (private mode); drafts are a convenience only.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, lang]);

  const switchLang = (l: string) => {
    setLang(l);
    let next = starter[l] ?? '';
    try {
      next = localStorage.getItem(draftKey(l)) ?? next;
    } catch {
      // Storage can be unavailable (private mode); drafts are a convenience only.
    }
    setCode(next);
  };

  const run = (kind: 'run' | 'submit') =>
    start(async () => {
      const r =
        kind === 'run'
          ? await runSamplesAction(slug, lang, code)
          : await submitAction({
              slug,
              lang,
              code,
              hintsUsed: hintsShown,
              solutionViewed: showEditorial,
              battleId,
            });
      setResult({ kind, r });
    });

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label="Language"
          className="flex gap-1 rounded-md bg-surface-2 p-1"
        >
          {LANGS.map((l) => (
            <button
              key={l.id}
              role="tab"
              aria-selected={lang === l.id}
              onClick={() => switchLang(l.id)}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium',
                lang === l.id
                  ? 'bg-surface text-fg shadow-[var(--shadow)]'
                  : 'text-fg-muted hover:text-fg',
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="ml-auto text-xs text-fg-muted hover:text-fg"
          onClick={() => setCode(starter[lang] ?? '')}
        >
          Reset to starter
        </button>
      </div>

      <div className="h-[26rem] overflow-hidden rounded-[var(--radius)] border border-border">
        <Editor
          height="100%"
          language={LANGS.find((l) => l.id === lang)!.monaco}
          value={code}
          onChange={(v) => setCode(v ?? '')}
          theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" disabled={pending} onClick={() => run('run')}>
          <Play size={14} aria-hidden /> Run samples
        </Button>
        <Button size="sm" disabled={pending} onClick={() => run('submit')}>
          <Send size={14} aria-hidden /> {pending ? 'Judging…' : 'Submit'}
        </Button>
        <span className="ml-auto flex gap-2">
          {hints.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              disabled={hintsShown >= hints.length}
              onClick={() => setHintsShown((h) => h + 1)}
            >
              <Lightbulb size={14} aria-hidden /> Hint {hintsShown}/{hints.length}
            </Button>
          )}
          {editorial && (
            <Button variant="ghost" size="sm" onClick={() => setShowEditorial((s) => !s)}>
              <BookOpen size={14} aria-hidden /> {showEditorial ? 'Hide' : 'View'} editorial
            </Button>
          )}
        </span>
      </div>

      {hintsShown > 0 && (
        <ol className="list-decimal rounded-md bg-surface-2 py-2 pr-3 pl-7 text-sm text-fg">
          {hints.slice(0, hintsShown).map((h) => (
            <li key={h}>{h}</li>
          ))}
          <p className="-ml-4 pt-1 text-[11px] text-fg-subtle">
            Hints reduce how much a solve counts as evidence (×0.7).
          </p>
        </ol>
      )}

      {showEditorial && editorial && (
        <div className="rounded-md border border-tone-active bg-tone-active-soft p-3">
          <p className="mb-2 text-xs text-fg">
            Reference C++ solution. Submitting after viewing it counts at ×0.25 — reading has value,
            just not much.
          </p>
          <pre className="max-h-72 overflow-auto rounded bg-surface p-3 font-mono text-xs text-fg">
            {editorial}
          </pre>
          {lang === 'cpp' && (
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={() => setCode(editorial)}
            >
              Load into editor
            </Button>
          )}
        </div>
      )}

      {result && <VerdictPanel kind={result.kind} r={result.r} />}
    </div>
  );
}

function VerdictPanel({ kind, r }: { kind: 'run' | 'submit'; r: RunResponse }) {
  if ('error' in r)
    return (
      <p className="rounded-md bg-tone-error-soft px-3 py-2 text-sm text-tone-error">{r.error}</p>
    );
  const v = VERDICT[r.status]!;
  return (
    <div
      aria-live="polite"
      className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={v.tone} className="px-3 py-1 text-xs">
          {v.label}
        </Badge>
        <span className="text-sm text-fg-muted">
          {kind === 'run' ? 'Samples' : 'Tests'} passed:{' '}
          <strong className="text-fg">{r.passed}</strong>/{r.total}
          {r.runtimeMs !== null && ` · ${r.runtimeMs} ms`} · judge: {r.judge}
        </span>
        {r.submissionId && (
          <Link
            href={`/practice/submission/${r.submissionId}`}
            className="ml-auto text-xs text-accent hover:underline"
          >
            submission →
          </Link>
        )}
      </div>
      {r.message && (
        <pre className="max-h-48 overflow-auto rounded bg-surface-2 p-2 font-mono text-xs whitespace-pre-wrap text-fg">
          {r.message}
        </pre>
      )}
      {r.failedCase && (
        <div className="grid gap-2 text-xs sm:grid-cols-3">
          <Case label="Input" text={r.failedCase.input} />
          <Case label="Expected" text={r.failedCase.expected} />
          <Case
            label={r.judge.startsWith('ai') ? 'Predicted output' : 'Your output'}
            text={r.failedCase.actual || '(nothing)'}
          />
          {r.failedCase.stderr && <Case label="stderr" text={r.failedCase.stderr} />}
        </div>
      )}
      {kind === 'submit' && r.status === 'ac' && (
        <p className="text-sm text-tone-found">
          Recorded as evidence — your skill model and readiness just updated.
        </p>
      )}
    </div>
  );
}

function Case({ label, text }: { label: string; text: string }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 font-semibold text-fg-muted">{label}</p>
      <pre className="max-h-40 overflow-auto rounded bg-surface-2 p-2 font-mono whitespace-pre-wrap text-fg">
        {text}
      </pre>
    </div>
  );
}

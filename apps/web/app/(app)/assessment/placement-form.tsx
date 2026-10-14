'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button, buttonClasses, cn } from '@careerforge/ui';
import { submitPlacementAction } from './actions';

type Q = { slug: string; prompt: string; options: string[]; skillName: string };

export function PlacementForm({ questions }: { questions: Q[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Awaited<ReturnType<typeof submitPlacementAction>> | null>(
    null,
  );
  const [pending, start] = useTransition();
  const byslug = new Map(results?.map((r) => [r.slug, r]));
  const score = results?.filter((r) => r.correct).length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      {questions.map((q, i) => {
        const r = byslug.get(q.slug);
        return (
          <fieldset
            key={q.slug}
            className="rounded-[var(--radius)] border border-border bg-surface p-4"
          >
            <legend className="sr-only">Question {i + 1}</legend>
            <p className="mb-1 text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">
              {i + 1} · {q.skillName}
            </p>
            <p className="mb-3 text-sm font-medium text-fg">{q.prompt}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {q.options.map((o) => (
                <label
                  key={o}
                  className={cn(
                    'cursor-pointer rounded-md border px-3 py-2 text-sm',
                    r
                      ? o === r.answer
                        ? 'border-tone-found bg-tone-found-soft'
                        : answers[q.slug] === o
                          ? 'border-tone-error bg-tone-error-soft'
                          : 'border-border opacity-60'
                      : answers[q.slug] === o
                        ? 'border-accent bg-accent-soft'
                        : 'border-border hover:border-border-strong',
                  )}
                >
                  <input
                    type="radio"
                    name={q.slug}
                    value={o}
                    className="sr-only"
                    disabled={!!results}
                    checked={answers[q.slug] === o}
                    onChange={() => setAnswers((a) => ({ ...a, [q.slug]: o }))}
                  />
                  {o}
                </label>
              ))}
            </div>
            {r && <p className="mt-2 text-xs text-fg-muted">{r.explanation}</p>}
          </fieldset>
        );
      })}
      {results ? (
        <div
          aria-live="polite"
          className="flex flex-wrap items-center gap-4 rounded-[var(--radius)] border border-accent bg-accent-soft/50 p-4"
        >
          <p className="text-sm text-fg">
            <strong>
              {score}/{results.length}
            </strong>{' '}
            — each answer is now evidence on its skill. Your dashboard, plan and readiness have
            updated.
          </p>
          <Link href="/dashboard" className={buttonClasses('primary', 'sm')}>
            See my dashboard
          </Link>
        </div>
      ) : (
        <Button
          disabled={pending || Object.keys(answers).length < questions.length}
          onClick={() => start(async () => setResults(await submitPlacementAction(answers)))}
        >
          {pending
            ? 'Scoring…'
            : `Submit (${Object.keys(answers).length}/${questions.length} answered)`}
        </Button>
      )}
    </div>
  );
}

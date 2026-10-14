'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Lightbulb, X } from 'lucide-react';
import { Player } from '@careerforge/viz-react';
import { Badge, Button, cn } from '@careerforge/ui';
import {
  answerQuizAction,
  completeLessonAction,
  explainAction,
  recordCheckpointAction,
} from './actions';

export function LessonViz({
  algorithmId,
  input,
  practice,
  caption,
}: {
  algorithmId: string;
  input?: unknown;
  practice?: boolean;
  caption?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {caption && <p className="text-sm text-fg-muted">{caption}</p>}
      <Player
        algorithmId={algorithmId}
        initialInput={input}
        practiceAvailable
        startInPractice={practice}
        onCheckpointAnswered={(e) => {
          void recordCheckpointAction({
            algorithmId: e.algorithmId,
            step: e.step,
            anchor: e.anchor,
            correct: e.correct,
            given: e.given,
          });
        }}
      />
      {practice && (
        <p className="text-xs text-fg-subtle">
          Practice mode is on: every answer is recorded as evidence for this skill.
        </p>
      )}
    </div>
  );
}

export function QuizBlock({
  slug,
  prompt,
  options,
  lessonId,
}: {
  slug: string;
  prompt: string;
  options: string[];
  lessonId: string;
}) {
  const [result, setResult] = useState<{
    correct: boolean;
    answer: string;
    explanation: string;
    given: string;
  } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
      <p className="mb-1 text-[11px] text-fg-subtle">Quick check</p>
      <p className="mb-3 text-sm font-medium text-fg">{prompt}</p>
      <div className="flex flex-col gap-2">
        {options.map((o) => {
          const chosen = result?.given === o;
          const right = result && o === result.answer;
          return (
            <button
              key={o}
              type="button"
              disabled={!!result || pending}
              onClick={() =>
                start(async () =>
                  setResult({ ...(await answerQuizAction(slug, o, lessonId)), given: o }),
                )
              }
              className={cn(
                'rounded-md border px-3 py-2 text-left text-sm transition-colors',
                right
                  ? 'border-tone-found bg-tone-found-soft text-fg'
                  : chosen
                    ? 'border-tone-error bg-tone-error-soft text-fg'
                    : 'border-border text-fg hover:border-accent',
                result && !right && !chosen && 'opacity-60',
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
      {result && (
        <p aria-live="polite" className="mt-3 flex items-start gap-2 text-sm">
          {result.correct ? (
            <Check size={16} className="mt-0.5 text-tone-found" aria-hidden />
          ) : (
            <X size={16} className="mt-0.5 text-tone-error" aria-hidden />
          )}
          <span>
            <strong>{result.correct ? 'Correct.' : 'Not quite.'}</strong> {result.explanation}
          </span>
        </p>
      )}
    </div>
  );
}

export function ExplainBlock({
  prompt,
  keyPoints,
  skillSlug,
  lessonId,
}: {
  prompt: string;
  keyPoints: string[];
  skillSlug: string;
  lessonId: string;
}) {
  const [text, setText] = useState('');
  const [pending, start] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof explainAction>> | null>(null);
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface p-4">
      <p className="flex items-center gap-1.5 text-[11px] text-accent">
        <Lightbulb size={13} aria-hidden /> Explain it
      </p>
      <p className="text-sm font-medium text-fg">{prompt}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Write it like you'd say it to an interviewer…"
        className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-fg outline-none focus:border-accent"
      />
      <div>
        <Button
          size="sm"
          disabled={pending || text.trim().length < 10}
          onClick={() =>
            start(async () =>
              setResult(
                await explainAction({ skillSlug, lessonId, prompt, keyPoints, answer: text }),
              ),
            )
          }
        >
          {pending ? 'Grading…' : 'Get feedback'}
        </Button>
      </div>
      {result && 'error' in result && <p className="text-sm text-tone-error">{result.error}</p>}
      {result && !('error' in result) && (
        <div aria-live="polite" className="rounded-md bg-surface-2 px-3 py-2 text-sm">
          <p className="mb-1">
            Level:{' '}
            <Badge
              tone={result.level === 'strong' || result.level === 'solid' ? 'success' : 'warning'}
            >
              {result.level}
            </Badge>{' '}
            <span className="text-xs text-fg-subtle">
              (
              {result.mode === 'claude' ? 'graded by Claude' : 'graded by the deterministic rubric'}
              )
            </span>
          </p>
          <p className="text-fg">{result.feedback}</p>
          {result.covered.length > 0 && (
            <p className="mt-1 text-xs text-fg-muted">Covered: {result.covered.join(', ')}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function CompleteLesson({
  lessonId,
  completed,
  nextHref,
}: {
  lessonId: string;
  completed: boolean;
  nextHref: string | null;
}) {
  const started = useRef(0);
  useEffect(() => {
    started.current = Date.now();
  }, []);
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            if (!completed)
              await completeLessonAction(lessonId, (Date.now() - started.current) / 1000);
            router.push(nextHref ?? '/learn');
            router.refresh();
          })
        }
      >
        {completed
          ? nextHref
            ? 'Next lesson →'
            : 'Back to topics'
          : nextHref
            ? 'Mark complete & continue →'
            : 'Mark complete'}
      </Button>
      {completed && (
        <span className="flex items-center gap-1 text-sm text-tone-found">
          <Check size={15} aria-hidden /> Completed
        </span>
      )}
    </div>
  );
}

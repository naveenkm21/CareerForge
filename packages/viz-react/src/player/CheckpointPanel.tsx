'use client';

import { useState } from 'react';
import { Check, Lightbulb, X } from 'lucide-react';
import type { Checkpoint } from '@careerforge/viz';
import { Button, cn } from '@careerforge/ui';

export type CheckpointAnswer = { given: string; correct: boolean };

export function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * "Predict the next step." The correct answer is simply what the algorithm does next, so the
 * trace grades it (docs/03 §6). A wrong answer returns the violated invariant, not a red X.
 */
export function CheckpointPanel({
  checkpoint,
  invariant,
  answer,
  onAnswer,
  onContinue,
}: {
  checkpoint: Checkpoint;
  invariant: string | undefined;
  answer: CheckpointAnswer | undefined;
  onAnswer: (given: string) => void;
  onContinue: () => void;
}) {
  const [value, setValue] = useState('');

  return (
    <div
      className="rounded-[var(--radius)] border-2 border-accent bg-accent-soft/40 p-4"
      role="group"
      aria-labelledby="cf-checkpoint-prompt"
    >
      <p className="mb-1 flex items-center gap-1.5 text-[12px] text-accent">
        <Lightbulb size={13} aria-hidden /> Predict the next step
      </p>
      <p id="cf-checkpoint-prompt" className="mb-3 text-sm font-medium text-fg">
        {checkpoint.prompt}
      </p>

      {!answer && checkpoint.kind === 'choice' && (
        <div className="flex flex-wrap gap-2">
          {checkpoint.options.map((o) => (
            <Button key={o} variant="secondary" size="sm" onClick={() => onAnswer(o)}>
              {o}
            </Button>
          ))}
        </div>
      )}

      {!answer && checkpoint.kind === 'value' && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) onAnswer(value);
          }}
        >
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="Your answer"
            className="h-8 w-32 rounded-md border border-border bg-surface px-2 font-mono text-sm text-fg outline-none focus:border-accent"
          />
          <Button type="submit" size="sm">
            Check
          </Button>
        </form>
      )}

      {answer && (
        <div aria-live="polite" className="flex flex-col gap-2">
          <p
            className={cn(
              'flex items-center gap-1.5 text-sm font-semibold',
              answer.correct ? 'text-tone-found' : 'text-tone-error',
            )}
          >
            {answer.correct ? <Check size={16} aria-hidden /> : <X size={16} aria-hidden />}
            {answer.correct ? 'Correct.' : `Not quite — the answer is “${checkpoint.answer}”.`}
          </p>
          {!answer.correct && invariant && (
            <p className="text-sm text-fg-muted">
              <span className="font-semibold text-fg">Invariant: </span>
              {invariant}
            </p>
          )}
          {checkpoint.explain && <p className="text-sm text-fg-muted">{checkpoint.explain}</p>}
          <div>
            <Button size="sm" onClick={onContinue} autoFocus>
              Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

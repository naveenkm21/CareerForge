'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Pause,
  Pencil,
  Play,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import {
  getAlgorithm,
  runAlgorithm,
  TONES,
  type AnyAlgorithm,
  type Lang,
  type Step,
  type Tone,
} from '@careerforge/viz';
import { Button, cn, Kbd } from '@careerforge/ui';
import { StructureView } from '../renderers/StructureView';
import { SvgDefs } from '../renderers/ArrayView';
import { TONE_LABELS, toneSoft, toneStrong } from '../tones';
import { CodePane } from './CodePane';
import { VarsPanel } from './VarsPanel';
import { CheckpointPanel, normalizeAnswer, type CheckpointAnswer } from './CheckpointPanel';
import { InputEditor } from './InputEditor';

const SPEEDS = [0.5, 1, 2, 4] as const;
const BASE_DELAY_MS = 1100;

export type CheckpointEvent = {
  algorithmId: string;
  step: number;
  anchor: string;
  correct: boolean;
  given: string;
};

export type PlayerProps = {
  algorithmId: string;
  initialInput?: unknown;
  initialStep?: number;
  initialLang?: Lang;
  /** Mirror step/input/lang into the URL so any state is deep-linkable (docs/03 §5). */
  syncUrl?: boolean;
  practiceAvailable?: boolean;
  /** Open with practice mode already on (the ladder's Predict stage). */
  startInPractice?: boolean;
  reducedMotion?: boolean;
  /** Phase 4 wires this to `checkpoint.answered` evidence events. */
  onCheckpointAnswered?: (e: CheckpointEvent) => void;
};

export function Player(props: PlayerProps) {
  const def = getAlgorithm(props.algorithmId);
  if (!def) {
    return (
      <p role="alert" className="text-sm text-tone-error">
        Unknown algorithm “{props.algorithmId}”.
      </p>
    );
  }
  return <PlayerInner key={props.algorithmId} def={def} {...props} />;
}

function PlayerInner({
  def,
  algorithmId,
  initialInput,
  initialStep = 0,
  initialLang = 'cpp',
  syncUrl = false,
  practiceAvailable = true,
  startInPractice = false,
  reducedMotion = false,
  onCheckpointAnswered,
}: PlayerProps & { def: AnyAlgorithm }) {
  const [initial] = useState(() => {
    if (initialInput !== undefined && runAlgorithm(def, initialInput).ok)
      return { input: initialInput as Record<string, unknown>, rejected: false };
    return {
      input: def.defaultInput as Record<string, unknown>,
      rejected: initialInput !== undefined,
    };
  });
  const [input, setInput] = useState<Record<string, unknown>>(initial.input);
  const [inputRejected, setInputRejected] = useState(initial.rejected);
  const run = useMemo(() => runAlgorithm(def, input), [def, input]);
  const steps = useMemo(() => (run.ok ? run.trace.steps : []), [run]);
  const last = Math.max(0, steps.length - 1);

  const [step, setStep] = useState(() => Math.min(Math.max(0, initialStep), last));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [lang, setLang] = useState<Lang>(initialLang);
  const [practice, setPractice] = useState(startInPractice && practiceAvailable);
  const [asking, setAsking] = useState(false);
  const [answers, setAnswers] = useState<Record<number, CheckpointAnswer>>({});
  const [editing, setEditing] = useState(false);

  const current = steps[step];
  const prev = step > 0 ? steps[step - 1] : undefined;
  const pendingCheckpoint = practice && current?.checkpoint && !answers[step];

  const goto = useCallback(
    (i: number) => {
      setAsking(false);
      setStep(Math.min(Math.max(0, i), last));
    },
    [last],
  );

  /** Advance one step — unless practice mode requires answering this step's checkpoint first. */
  const next = useCallback(() => {
    if (pendingCheckpoint) {
      setPlaying(false);
      setAsking(true);
      return;
    }
    if (step >= last) {
      setPlaying(false);
      return;
    }
    setAsking(false);
    setStep(step + 1);
  }, [pendingCheckpoint, step, last]);

  // Playback loop.
  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(next, BASE_DELAY_MS / speed);
    return () => clearTimeout(id);
  }, [playing, next, speed, step]);

  // Keyboard: ←/→ step · space play/pause · 0 restart · e edit input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.closest('input, textarea, select, [contenteditable="true"]') ||
          e.metaKey ||
          e.ctrlKey ||
          e.altKey)
      )
        return;
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') goto(step - 1);
      else if (e.key === ' ' && !(t instanceof HTMLButtonElement)) setPlaying((p) => !p);
      else if (e.key === '0' || e.key === 'Home') goto(0);
      else if (e.key === 'End') goto(last);
      else if (e.key === 'e') setEditing(true);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, goto, step, last]);

  // Deep-link sync (replaceState: no history spam, no Next navigation).
  const defaultJson = useMemo(() => JSON.stringify(def.defaultInput), [def]);
  const urlTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!syncUrl) return;
    clearTimeout(urlTimer.current);
    urlTimer.current = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const json = JSON.stringify(input);
      if (json === defaultJson) params.delete('input');
      else params.set('input', json);
      if (step === 0) params.delete('step');
      else params.set('step', String(step));
      if (lang === 'cpp') params.delete('lang');
      else params.set('lang', lang);
      const qs = params.toString();
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${qs ? `?${qs}` : ''}`,
      );
    }, 200);
    return () => clearTimeout(urlTimer.current);
  }, [syncUrl, input, step, lang, defaultJson]);

  const answer = (given: string) => {
    const cp = current?.checkpoint;
    if (!cp || !current) return;
    const correct = normalizeAnswer(given) === normalizeAnswer(cp.answer);
    setAnswers((a) => ({ ...a, [step]: { given, correct } }));
    onCheckpointAnswered?.({ algorithmId, step, anchor: current.anchor, correct, given });
  };

  const applyInput = (value: Record<string, unknown>) => {
    setInput(value);
    setInputRejected(false);
    setStep(0);
    setAnswers({});
    setAsking(false);
    setPlaying(false);
    setEditing(false);
  };

  const usedTones = useMemo(() => {
    const set = new Set<Tone>();
    for (const s of steps) for (const m of s.marks) if (m.type !== 'compare') set.add(m.tone);
    return TONES.filter((t) => set.has(t));
  }, [steps]);

  const answered = Object.values(answers);
  const score = answered.filter((a) => a.correct).length;
  const decls = run.ok ? run.trace.structures : [];
  const main = decls.filter((d) => d.placement !== 'side');
  const side = decls.filter((d) => d.placement === 'side');

  return (
    <MotionConfig
      reducedMotion={reducedMotion ? 'always' : 'user'}
      transition={{ duration: 0.35 / Math.sqrt(speed), ease: 'easeInOut' }}
    >
      <SvgDefs />
      <div className="flex flex-col gap-4">
        {inputRejected && (
          <p
            role="status"
            className="rounded-md bg-tone-active-soft px-3 py-2 text-sm text-tone-active"
          >
            The input in this link was invalid, so the default input is shown.
          </p>
        )}

        {editing && (
          <InputEditor
            def={def}
            input={input}
            onApply={applyInput}
            onClose={() => setEditing(false)}
          />
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Stage first on small screens; code first (left) on large ones. */}
          <section
            aria-label="Visualization"
            className="order-1 flex min-w-0 flex-col gap-4 lg:order-2"
          >
            <div className="rounded-[var(--radius)] border border-border bg-surface p-4 sm:p-5">
              {run.ok ? (
                <div
                  className={cn(
                    'grid gap-6',
                    side.length > 0 && 'xl:grid-cols-[minmax(0,1fr)_15rem]',
                  )}
                >
                  <div className="flex min-w-0 flex-col gap-6">
                    {main.map((d) => (
                      <StructureView
                        key={d.id}
                        decl={d}
                        state={current?.snapshot[d.id]}
                        marks={current?.marks ?? []}
                      />
                    ))}
                  </div>
                  {side.length > 0 && (
                    <div className="flex min-w-0 flex-col gap-5 border-t border-border pt-5 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-5">
                      {side.map((d) => (
                        <StructureView
                          key={d.id}
                          decl={d}
                          state={current?.snapshot[d.id]}
                          marks={current?.marks ?? []}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p role="alert" className="text-sm text-tone-error">
                  {run.error}
                </p>
              )}
            </div>

            {asking && current?.checkpoint ? (
              <CheckpointPanel
                key={step}
                checkpoint={current.checkpoint}
                invariant={current.invariant}
                answer={answers[step]}
                onAnswer={answer}
                onContinue={() => {
                  setAsking(false);
                  if (step < last) setStep(step + 1);
                }}
              />
            ) : (
              <Narration step={current} total={steps.length} practice={practice} />
            )}
          </section>

          <section aria-label="Code" className="order-2 flex min-w-0 flex-col gap-3 lg:order-1">
            {run.ok && (
              <CodePane
                sources={run.trace.sources}
                lang={lang}
                onLang={setLang}
                anchor={current?.anchor}
              />
            )}
            <VarsPanel step={current} prev={prev} />
            {run.ok && (
              <p className="px-1 text-xs text-fg-muted">
                <span className="font-semibold text-fg">Time</span> {run.trace.complexity.time} ·{' '}
                <span className="font-semibold text-fg">Space</span> {run.trace.complexity.space}
              </p>
            )}
          </section>
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-bg/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-[var(--radius)] sm:border">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Restart" onClick={() => goto(0)}>
                <SkipBack size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous step"
                onClick={() => goto(step - 1)}
                disabled={step === 0}
              >
                <ChevronLeft size={18} />
              </Button>
              <Button
                size="icon"
                aria-label={playing ? 'Pause' : 'Play'}
                onClick={() => {
                  if (!playing && step >= last) goto(0);
                  setPlaying((p) => !p);
                }}
                disabled={!run.ok}
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Next step"
                onClick={next}
                disabled={step >= last && !pendingCheckpoint}
              >
                <ChevronRight size={18} />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Last step" onClick={() => goto(last)}>
                <SkipForward size={16} />
              </Button>
            </div>

            <label className="flex min-w-40 flex-1 items-center gap-2">
              <span className="sr-only">Scrub through steps</span>
              <input
                type="range"
                min={0}
                max={last}
                value={step}
                onChange={(e) => goto(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
              <span
                className="shrink-0 font-mono text-xs text-fg-muted tabular-nums"
                aria-live="polite"
              >
                {steps.length ? step + 1 : 0} / {steps.length}
              </span>
            </label>

            <div className="flex items-center gap-1" role="radiogroup" aria-label="Playback speed">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  role="radio"
                  aria-checked={speed === s}
                  onClick={() => setSpeed(s)}
                  className={cn(
                    'h-7 rounded-md px-2 font-mono text-xs',
                    speed === s ? 'bg-surface-3 text-fg' : 'text-fg-muted hover:text-fg',
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>

            {practiceAvailable && (
              <Button
                variant={practice ? 'primary' : 'secondary'}
                size="sm"
                aria-pressed={practice}
                onClick={() => {
                  setPractice((p) => !p);
                  setAsking(false);
                }}
                title="Pause at each checkpoint and predict what the algorithm does next"
              >
                <GraduationCap size={15} aria-hidden /> Practice
                {practice && answered.length > 0 ? ` ${score}/${answered.length}` : ''}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditing((v) => !v)}
              aria-expanded={editing}
            >
              <Pencil size={14} aria-hidden /> Edit input
            </Button>
          </div>
          <p className="mt-2 hidden gap-3 text-[11px] text-fg-subtle md:flex">
            <span>
              <Kbd>←</Kbd> <Kbd>→</Kbd> step
            </span>
            <span>
              <Kbd>space</Kbd> play
            </span>
            <span>
              <Kbd>0</Kbd> restart
            </span>
            <span>
              <Kbd>e</Kbd> edit input
            </span>
          </p>
        </div>

        {usedTones.length > 0 && (
          <ul aria-label="Colour legend" className="flex flex-wrap gap-x-4 gap-y-1.5 px-1">
            {usedTones.map((t) => (
              <li key={t} className="flex items-center gap-1.5 text-xs text-fg-muted">
                <span
                  className="h-3 w-3 rounded-sm border-2"
                  style={{ background: toneSoft(t), borderColor: toneStrong(t) }}
                  aria-hidden
                />
                {TONE_LABELS[t]}
              </li>
            ))}
          </ul>
        )}
      </div>
    </MotionConfig>
  );
}

function Narration({
  step: s,
  total,
  practice,
}: {
  step: Step | undefined;
  total: number;
  practice: boolean;
}) {
  if (!s) return null;
  const result = s.emphasis === 'result';
  return (
    <div
      aria-live="polite"
      className={cn(
        'rounded-[var(--radius)] border bg-surface px-4 py-3',
        result ? 'border-tone-found' : 'border-border',
      )}
      style={result ? { background: 'var(--tone-found-soft)' } : undefined}
    >
      <p className="mb-1 text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">
        Step {s.i + 1} of {total}
        {practice && s.checkpoint && (
          <span className="ml-2 text-accent normal-case">· checkpoint — press next to answer</span>
        )}
      </p>
      <p className="text-[15px] leading-relaxed text-fg">{s.narration}</p>
      {s.invariant && (
        <p className="mt-2 text-sm text-fg-muted">
          <span className="font-semibold text-fg">Invariant: </span>
          {s.invariant}
        </p>
      )}
    </div>
  );
}

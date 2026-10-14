import { AnimatePresence, motion } from 'motion/react';
import type { Mark, QueueState, StackState, Tone } from '@careerforge/viz';
import { formatScalar, resolveMarks, toneSoft, toneStrong } from '../tones';

function Item({ value, note, tone }: { value: unknown; note?: string; tone?: Tone | undefined }) {
  return (
    <div
      className="flex min-w-11 flex-col items-center justify-center rounded-md border px-2.5 py-1.5 font-mono transition-colors"
      style={{
        background: tone ? toneSoft(tone) : 'var(--surface)',
        borderColor: tone ? toneStrong(tone) : 'var(--border-strong)',
        borderWidth: tone ? 2 : 1,
      }}
    >
      <span className="text-sm font-semibold text-fg">{formatScalar(value)}</span>
      {note && <span className="text-[10px] leading-tight text-fg-muted">{note}</span>}
    </div>
  );
}

const ENTER = { opacity: 0, scale: 0.85 };
const SHOW = { opacity: 1, scale: 1 };

/** Stack drawn top-down: the top of the stack is the first row. */
export function StackView({
  id,
  state,
  marks,
  label,
}: {
  id: string;
  state: StackState;
  marks: Mark[];
  label: string;
}) {
  const m = resolveMarks(marks, id);
  const items = [...state.items].reverse();
  return (
    <div
      aria-label={`${label}: ${state.items.length} items`}
      role="list"
      className="flex flex-col items-stretch gap-1.5"
    >
      {items.length === 0 && <Empty />}
      <AnimatePresence initial={false}>
        {items.map((it, i) => (
          <motion.div
            key={it.id}
            layout
            initial={{ ...ENTER, y: -12 }}
            animate={SHOW}
            exit={{ opacity: 0, x: 24 }}
            role="listitem"
            className="relative"
          >
            <Item value={it.value} note={it.note} tone={m.cells.get(it.id)} />
            {i === 0 && (
              <span className="absolute top-1/2 -left-9 -translate-y-1/2 text-[10px] font-semibold tracking-wide text-fg-subtle uppercase">
                top
              </span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Queue drawn left-to-right: front on the left. */
export function QueueView({
  id,
  state,
  marks,
  label,
}: {
  id: string;
  state: QueueState;
  marks: Mark[];
  label: string;
}) {
  const m = resolveMarks(marks, id);
  return (
    <div aria-label={`${label}: ${state.items.length} items`} className="flex flex-col gap-1">
      <div className="flex justify-between text-[10px] font-semibold tracking-wide text-fg-subtle uppercase">
        <span>front</span>
        <span>back</span>
      </div>
      <div
        role="list"
        className="flex min-h-12 flex-wrap items-center gap-1.5 rounded-lg border border-dashed border-border-strong p-1.5"
      >
        {state.items.length === 0 && <span className="px-1 text-xs text-fg-subtle">empty</span>}
        <AnimatePresence initial={false}>
          {state.items.map((it) => (
            <motion.div
              key={it.id}
              layout
              initial={{ ...ENTER, x: 12 }}
              animate={SHOW}
              exit={{ opacity: 0, x: -20 }}
              role="listitem"
            >
              <Item value={it.value} note={it.note} tone={m.cells.get(it.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="rounded-md border border-dashed border-border-strong px-3 py-2 text-center text-xs text-fg-subtle">
      empty
    </div>
  );
}

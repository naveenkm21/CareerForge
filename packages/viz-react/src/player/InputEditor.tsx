'use client';

import { useState } from 'react';
import { formatInputForm, parseInputForm, runAlgorithm, type AnyAlgorithm } from '@careerforge/viz';
import { Button } from '@careerforge/ui';

/**
 * Edit the algorithm's input. Parsing is the shared pure codec; validation is the algorithm's
 * own zod schema, run client-side — re-running a trace is instant (ADR-003).
 */
export function InputEditor({
  def,
  input,
  onApply,
  onClose,
}: {
  def: AnyAlgorithm;
  input: Record<string, unknown>;
  onApply: (input: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [texts, setTexts] = useState(() => formatInputForm(def.inputSpec, input));
  const [errors, setErrors] = useState<string[]>([]);

  const apply = (next: Record<string, string>) => {
    const parsed = parseInputForm(def.inputSpec, next);
    if (!parsed.ok) return setErrors(parsed.errors);
    const run = runAlgorithm(def, parsed.value);
    if (!run.ok) return setErrors([run.error]);
    setErrors([]);
    onApply(parsed.value);
  };

  return (
    <form
      className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        apply(texts);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">
          Edit input
        </p>
        <button type="button" onClick={onClose} className="text-xs text-fg-muted hover:text-fg">
          Close
        </button>
      </div>

      {def.presets && def.presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {def.presets.map((p) => (
            <Button
              key={p.label}
              size="sm"
              variant="secondary"
              onClick={() => {
                const t = formatInputForm(def.inputSpec, p.input as Record<string, unknown>);
                setTexts(t);
                apply(t);
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {def.inputSpec.map((f) => {
          const multiline = f.kind === 'int-grid' || f.kind === 'edge-list';
          const common = {
            id: `cf-in-${f.name}`,
            value: texts[f.name] ?? '',
            onChange: (e: { target: { value: string } }) =>
              setTexts((t) => ({ ...t, [f.name]: e.target.value })),
            className:
              'w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-sm text-fg outline-none focus:border-accent',
            spellCheck: false,
          };
          return (
            <label
              key={f.name}
              htmlFor={common.id}
              className={multiline ? 'flex flex-col gap-1 sm:col-span-2' : 'flex flex-col gap-1'}
            >
              <span className="text-xs font-medium text-fg-muted">
                {f.label}
                {f.hint && <span className="font-normal text-fg-subtle"> — {f.hint}</span>}
              </span>
              {multiline ? (
                <textarea rows={f.kind === 'int-grid' ? 6 : 3} {...common} />
              ) : (
                <input {...common} />
              )}
            </label>
          );
        })}
      </div>

      {errors.length > 0 && (
        <ul
          role="alert"
          className="list-disc rounded-md bg-tone-error-soft py-2 pr-3 pl-7 text-sm text-tone-error"
        >
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Run
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            const t = formatInputForm(def.inputSpec, def.defaultInput as Record<string, unknown>);
            setTexts(t);
            apply(t);
          }}
        >
          Reset to default
        </Button>
      </div>
    </form>
  );
}

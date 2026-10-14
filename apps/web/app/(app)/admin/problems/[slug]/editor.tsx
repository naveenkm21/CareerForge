'use client';

import { useActionState, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@careerforge/ui';
import { saveProblemAction, type EditorState } from '../../actions';

type Initial = {
  slug: string;
  title: string;
  skillId: string;
  difficulty: number;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  status: 'draft' | 'published';
  reference: string;
  testcases: { input: string; expected: string; isSample: boolean }[];
};

const field =
  'rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent';

export function ProblemEditor({
  skills,
  initial,
}: {
  skills: { id: string; slug: string; name: string }[];
  initial: Initial | null;
}) {
  const [state, action, pending] = useActionState<EditorState, FormData>(saveProblemAction, {
    error: null,
    verify: null,
  });
  const [cases, setCases] = useState(
    initial?.testcases.length ? initial.testcases : [{ input: '', expected: '', isSample: true }],
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-fg-muted">Slug</span>
          <input
            name="slug"
            defaultValue={initial?.slug}
            readOnly={!!initial}
            required
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-fg-muted">Title</span>
          <input name="title" defaultValue={initial?.title} required className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-fg-muted">Skill</span>
          <select name="skillId" defaultValue={initial?.skillId} className={field}>
            {skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.slug}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-fg-muted">Difficulty (1–5)</span>
            <input
              name="difficulty"
              type="number"
              min={1}
              max={5}
              defaultValue={initial?.difficulty ?? 2}
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-fg-muted">Status</span>
            <select name="status" defaultValue={initial?.status ?? 'draft'} className={field}>
              <option value="draft">draft</option>
              <option value="published">published</option>
            </select>
          </label>
        </div>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs text-fg-muted">Statement (Markdown)</span>
        <textarea name="statement" rows={4} defaultValue={initial?.statement} className={field} />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        {(['inputFormat', 'outputFormat', 'constraints'] as const).map((k) => (
          <label key={k} className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-fg-muted">{k}</span>
            <textarea name={k} rows={3} defaultValue={initial?.[k]} className={field} />
          </label>
        ))}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs text-fg-subtle">Testcases</legend>
        {cases.map((c, i) => (
          <div
            key={i}
            className="grid gap-2 rounded-md border border-border p-2 sm:grid-cols-[1fr_1fr_auto]"
          >
            <textarea
              name="tc_input"
              rows={3}
              defaultValue={c.input}
              placeholder="stdin"
              className={`${field} font-mono text-xs`}
            />
            <textarea
              name="tc_expected"
              rows={3}
              defaultValue={c.expected}
              placeholder="expected stdout"
              className={`${field} font-mono text-xs`}
            />
            <div className="flex flex-col items-start gap-2">
              <label className="flex items-center gap-1 text-xs text-fg-muted">
                <input
                  type="checkbox"
                  name="tc_sample"
                  value={String(i)}
                  defaultChecked={c.isSample}
                />{' '}
                sample
              </label>
              <button
                type="button"
                aria-label="Remove testcase"
                className="text-fg-subtle hover:text-tone-error"
                onClick={() => setCases((cs) => cs.filter((_, j) => j !== i))}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => setCases((cs) => [...cs, { input: '', expected: '', isSample: false }])}
        >
          <Plus size={14} aria-hidden /> Add testcase
        </Button>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs text-fg-muted">
          Reference solution (C++) — used to verify testcases and shown as the editorial
        </span>
        <textarea
          name="reference"
          rows={10}
          defaultValue={initial?.reference}
          className={`${field} font-mono text-xs`}
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-tone-error">
          {state.error}
        </p>
      )}
      {state.verify && (
        <p className="rounded-md bg-surface-2 px-3 py-2 text-sm text-fg">{state.verify}</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" name="intent" value="verify" variant="secondary" disabled={pending}>
          Verify with reference
        </Button>
        <Button type="submit" name="intent" value="save" disabled={pending}>
          {pending ? 'Saving…' : 'Save new version'}
        </Button>
      </div>
    </form>
  );
}

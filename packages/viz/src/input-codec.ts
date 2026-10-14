import type { InputField } from './define';

/**
 * Text ⇄ value conversion for the "edit input" form. Pure, so the same codec serves the
 * player UI, deep links, and tests. Semantic validation stays in each algorithm's zod schema.
 */

export type ParseResult = { ok: true; value: unknown } | { ok: false; error: string };

const INT = /^-?\d+$/;

function splitList(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseField(field: InputField, text: string): ParseResult {
  switch (field.kind) {
    case 'int': {
      const s = text.trim();
      return INT.test(s)
        ? { ok: true, value: Number(s) }
        : { ok: false, error: `${field.label}: enter a whole number` };
    }
    case 'string':
      return { ok: true, value: text.trim() };
    case 'int-array': {
      const parts = splitList(text);
      const bad = parts.find((p) => !INT.test(p));
      if (bad !== undefined)
        return { ok: false, error: `${field.label}: "${bad}" is not a whole number` };
      return { ok: true, value: parts.map(Number) };
    }
    case 'string-list':
      return { ok: true, value: splitList(text) };
    case 'int-grid': {
      const rows = text
        .split(/\n|;/)
        .map((r) => splitList(r))
        .filter((r) => r.length > 0);
      for (const r of rows) {
        const bad = r.find((p) => !INT.test(p));
        if (bad !== undefined)
          return { ok: false, error: `${field.label}: "${bad}" is not a whole number` };
      }
      return { ok: true, value: rows.map((r) => r.map(Number)) };
    }
    case 'edge-list': {
      const edges: { from: string; to: string; weight?: number }[] = [];
      for (const token of text
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean)) {
        const m = /^([A-Za-z0-9]+)\s*[-–>]+\s*([A-Za-z0-9]+)(?:\s*[:=]\s*(-?\d+))?$/.exec(token);
        if (!m)
          return {
            ok: false,
            error: `${field.label}: cannot read "${token}" — use A-B${field.weighted ? ':4' : ''}`,
          };
        if (field.weighted && m[3] === undefined)
          return {
            ok: false,
            error: `${field.label}: "${token}" needs a weight, e.g. ${m[1]}-${m[2]}:4`,
          };
        edges.push(
          m[3] === undefined
            ? { from: m[1]!, to: m[2]! }
            : { from: m[1]!, to: m[2]!, weight: Number(m[3]) },
        );
      }
      return { ok: true, value: edges };
    }
  }
}

export function formatField(field: InputField, value: unknown): string {
  switch (field.kind) {
    case 'int':
    case 'string':
      return String(value ?? '');
    case 'int-array':
    case 'string-list':
      return Array.isArray(value) ? value.join(', ') : '';
    case 'int-grid':
      return Array.isArray(value) ? (value as unknown[][]).map((r) => r.join(' ')).join('\n') : '';
    case 'edge-list':
      return Array.isArray(value)
        ? (value as { from: string; to: string; weight?: number }[])
            .map((e) => `${e.from}-${e.to}${e.weight === undefined ? '' : `:${e.weight}`}`)
            .join(', ')
        : '';
  }
}

/** Parses every field of a form into an input object, collecting all errors. */
export function parseInputForm(
  fields: InputField[],
  texts: Record<string, string>,
): { ok: true; value: Record<string, unknown> } | { ok: false; errors: string[] } {
  const value: Record<string, unknown> = {};
  const errors: string[] = [];
  for (const f of fields) {
    const r = parseField(f, texts[f.name] ?? '');
    if (r.ok) value[f.name] = r.value;
    else errors.push(r.error);
  }
  return errors.length ? { ok: false, errors } : { ok: true, value };
}

export function formatInputForm(
  fields: InputField[],
  input: Record<string, unknown>,
): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f.name, formatField(f, input[f.name])]));
}

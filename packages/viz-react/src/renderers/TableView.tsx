import type { Mark, TableState } from '@careerforge/viz';
import { formatScalar, resolveMarks, toneSoft, toneStrong } from '../tones';

/** DP tables, distance tables, in-degree tables — any labelled grid of scalars. */
export function TableView({
  id,
  state,
  marks,
  label,
}: {
  id: string;
  state: TableState;
  marks: Mark[];
  label: string;
}) {
  const m = resolveMarks(marks, id);
  return (
    <div className="overflow-x-auto">
      <table aria-label={label} className="border-separate border-spacing-1 font-mono text-sm">
        <thead>
          <tr>
            <th />
            {state.columns.map((c, i) => (
              <th
                key={i}
                scope="col"
                className="px-1 text-center text-[11px] font-semibold text-fg-subtle"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.rows.map((row) => (
            <tr key={row.id}>
              <th
                scope="row"
                className="pr-2 text-right text-[11px] font-semibold whitespace-nowrap text-fg-muted"
              >
                {row.label}
              </th>
              {row.cells.map((v, c) => {
                const tone = m.cells.get(`${row.id},${c}`);
                return (
                  <td
                    key={c}
                    className="h-9 min-w-9 rounded-md border px-1.5 text-center font-semibold text-fg transition-colors"
                    style={{
                      background: tone ? toneSoft(tone) : 'var(--surface)',
                      borderColor: tone ? toneStrong(tone) : 'var(--border)',
                      borderWidth: tone ? 2 : 1,
                    }}
                  >
                    {formatScalar(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

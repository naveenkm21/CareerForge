import { z } from 'zod';
import { defineAlgorithm, InputError } from '../../define';

const DIRS: [number, number, string][] = [
  [-1, 0, 'up'],
  [1, 0, 'down'],
  [0, -1, 'left'],
  [0, 1, 'right'],
];

export default defineAlgorithm({
  id: 'flood-fill',
  title: 'Flood Fill (Grid BFS)',
  category: 'graphs',
  skillId: 'dsa.graphs.grid',
  summary:
    'Treat each cell as a node joined to its four neighbours, and BFS through every cell of the starting colour.',
  difficulty: 2,
  params: z
    .object({
      grid: z
        .array(z.array(z.number().int().min(0).max(1)))
        .min(1)
        .max(7),
      sr: z.number().int().min(0),
      sc: z.number().int().min(0),
    })
    .superRefine((v, ctx) => {
      const cols = v.grid[0]?.length ?? 0;
      if (cols === 0 || cols > 7)
        ctx.addIssue({ code: 'custom', path: ['grid'], message: 'rows need 1–7 cells' });
      if (v.grid.some((r) => r.length !== cols))
        ctx.addIssue({
          code: 'custom',
          path: ['grid'],
          message: 'every row needs the same length',
        });
      if (v.sr >= v.grid.length || v.sc >= cols)
        ctx.addIssue({ code: 'custom', path: ['sr'], message: 'start cell is outside the grid' });
    }),
  inputSpec: [
    {
      name: 'grid',
      label: 'Grid (0 = water, 1 = land)',
      kind: 'int-grid',
      hint: 'one row per line, up to 7×7',
    },
    { name: 'sr', label: 'Start row', kind: 'int' },
    { name: 'sc', label: 'Start col', kind: 'int' },
  ],
  defaultInput: {
    grid: [
      [1, 1, 0, 0, 1],
      [0, 1, 1, 0, 1],
      [0, 0, 1, 0, 0],
      [1, 0, 1, 1, 0],
      [1, 0, 0, 1, 1],
    ],
    sr: 0,
    sc: 0,
  },
  complexity: { time: 'O(rows × cols)', space: 'O(rows × cols)' },

  run({ grid, sr, sc }, t) {
    const rows = grid.length;
    const cols = grid[0]!.length;
    const g = grid.map((r) => [...r]);
    const color = 2;
    const old = g[sr]![sc]!;
    if (old !== 1) throw new InputError('Start on a land cell (value 1).');

    const m = t.matrix('grid', g, {
      label: 'grid',
      rowLabels: g.map((_, i) => String(i)),
      colLabels: g[0]!.map((_, j) => String(j)),
    });
    const q = t.queue('queue', { label: 'queue (r,c)', placement: 'side' });
    let filled = 0;

    g[sr]![sc] = color;
    m.set(sr, sc, color).cell(sr, sc, 'frontier');
    q.enqueue(`${sr},${sc}`);
    filled++;
    t.at('init')
      .vars({ sr, sc, old, color })
      .say(`Colour the start (${sr},${sc}) and enqueue it.`)
      .invariant('Every queued cell is already coloured, so nothing is enqueued twice.')
      .step();

    while (!q.isEmpty) {
      const [r, c] = String(q.dequeue().value).split(',').map(Number) as [number, number];
      m.cell(r, c, 'active');
      t.at('dequeue')
        .vars({ r, c })
        .say(`Dequeue (${r},${c}); look at its four neighbours.`)
        .step();
      for (const [dr, dc, name] of DIRS) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        const ok = g[nr]![nc] === old;
        m.pointAt('n', nr, nc, ok ? 'candidate' : 'excluded');
        t.at('check')
          .vars({ nr, nc })
          .say(
            `${name}: (${nr},${nc}) = ${g[nr]![nc]}${ok ? ' — same colour as the start.' : g[nr]![nc] === color ? ' — already filled.' : ' — water.'}`,
          )
          .ask({
            kind: 'choice',
            prompt: `(${nr},${nc}) holds ${g[nr]![nc]}. Fill it and enqueue it?`,
            options: ['Fill and enqueue', 'Skip'],
            answer: ok ? 'Fill and enqueue' : 'Skip',
            explain: ok
              ? `It has the original colour ${old}.`
              : g[nr]![nc] === color
                ? 'It is already filled (and was enqueued then).'
                : 'It is water, not part of the region.',
          })
          .step();
        if (!ok) continue;
        g[nr]![nc] = color;
        filled++;
        m.set(nr, nc, color).cell(nr, nc, 'frontier');
        q.enqueue(`${nr},${nc}`);
        t.at('fill').say(`Colour (${nr},${nc}) and enqueue it.`).step();
      }
      m.unpointer('n').cell(r, c, 'found');
    }
    t.at('done')
      .vars({ r: undefined, c: undefined, nr: undefined, nc: undefined })
      .say(`Filled ${filled} connected cell${filled > 1 ? 's' : ''}.`)
      .emphasis('result')
      .step();
    return filled;
  },
});

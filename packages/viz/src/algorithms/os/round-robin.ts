import { z } from 'zod';
import { defineAlgorithm } from '../../define';

export default defineAlgorithm({
  id: 'round-robin',
  title: 'Round Robin CPU Scheduling',
  category: 'os',
  skillId: 'cs.os.scheduling',
  summary:
    'Each ready process runs for at most one time quantum, then goes to the back of the ready queue.',
  difficulty: 2,
  params: z
    .object({
      arrivals: z.array(z.number().int().min(0).max(20)).min(1).max(6),
      bursts: z.array(z.number().int().min(1).max(10)).min(1).max(6),
      quantum: z.number().int().min(1).max(6),
    })
    .refine((v) => v.arrivals.length === v.bursts.length, {
      message: 'need one arrival per burst',
      path: ['bursts'],
    })
    .refine((v) => v.bursts.reduce((a, b) => a + b, 0) <= 30, {
      message: 'total burst time must be ≤ 30',
      path: ['bursts'],
    }),
  inputSpec: [
    { name: 'arrivals', label: 'Arrival times', kind: 'int-array', hint: 'one per process' },
    { name: 'bursts', label: 'Burst times', kind: 'int-array' },
    { name: 'quantum', label: 'Time quantum', kind: 'int' },
  ],
  defaultInput: { arrivals: [0, 1, 2, 4], bursts: [5, 3, 1, 2], quantum: 2 },
  presets: [
    { label: 'Classic', input: { arrivals: [0, 1, 2, 4], bursts: [5, 3, 1, 2], quantum: 2 } },
    {
      label: 'Large quantum (≈ FCFS)',
      input: { arrivals: [0, 1, 2], bursts: [4, 3, 2], quantum: 6 },
    },
    { label: 'CPU goes idle', input: { arrivals: [0, 6], bursts: [2, 3], quantum: 2 } },
  ],
  complexity: { time: 'O(total burst time)', space: 'O(n)' },

  run({ arrivals, bursts, quantum }, t) {
    const n = bursts.length;
    const order = [...Array(n).keys()].sort((a, b) => arrivals[a]! - arrivals[b]! || a - b);
    const name = (i: number) => `P${i + 1}`;
    let idleTotal = 0;
    {
      let clock = 0;
      for (const i of order) {
        clock = Math.max(clock, arrivals[i]!);
        clock += bursts[i]!;
      }
      idleTotal = clock - bursts.reduce((a, b) => a + b, 0);
    }
    const span = bursts.reduce((a, b) => a + b, 0) + idleTotal;

    const procs = t.table(
      'procs',
      ['arrival', 'burst', 'remaining', 'finish', 'waiting'],
      order.map((i) => ({
        id: name(i),
        label: name(i),
        cells: [arrivals[i]!, bursts[i]!, bursts[i]!, null, null],
      })),
      { label: 'processes' },
    );
    const gantt = t.table(
      'gantt',
      Array.from({ length: span }, (_, k) => String(k)),
      [{ id: 'cpu', label: 'CPU' }],
      { label: 'Gantt chart (time →)' },
    );
    const ready = t.queue('ready', { label: 'ready queue', placement: 'side' });

    const remaining = [...bursts];
    const waiting: number[] = Array(n).fill(0);
    let clock = 0;
    let next = 0;
    let finished = 0;

    t.at('init')
      .vars({ quantum, t: 0 })
      .say(`Quantum = ${quantum}. Processes join the ready queue when they arrive.`)
      .invariant('A process never runs more than one quantum before yielding.')
      .step();

    const admit = (upTo: number) => {
      const joined: string[] = [];
      while (next < n && arrivals[order[next]!]! <= upTo) {
        const i = order[next++]!;
        ready.enqueue(name(i));
        joined.push(name(i));
      }
      return joined;
    };

    while (finished < n) {
      const joined = admit(clock);
      if (joined.length) {
        for (const j of joined) procs.cell(j, 0, 'frontier');
        t.at('arrive')
          .vars({ t: clock })
          .say(
            `t = ${clock}: ${joined.join(', ')} arrive${joined.length === 1 ? 's' : ''} and join the back of the queue.`,
          )
          .step();
        procs.clearMarks();
      }
      if (ready.isEmpty) {
        const until = arrivals[order[next]!]!;
        for (let k = clock; k < until; k++) gantt.set('cpu', k, '—');
        clock = until;
        t.at('arrive')
          .vars({ t: clock })
          .say(`The ready queue is empty — the CPU idles until t = ${clock}.`)
          .step();
        continue;
      }
      const items = ready.items();
      if (items.length >= 2) {
        t.at('dispatch')
          .say('The scheduler picks the next process.')
          .ask({
            kind: 'choice',
            prompt: 'Which process gets the CPU next?',
            options: items.map((x) => String(x.value)).sort(),
            answer: String(items[0]!.value),
            explain: 'Round Robin is FIFO over the ready queue: the front process runs next.',
          })
          .step();
      }
      const p = String(ready.dequeue().value);
      const i = Number(p.slice(1)) - 1;
      const slice = Math.min(quantum, remaining[i]!);
      procs.clearMarks().cell(p, 2, 'active');
      t.at('dispatch')
        .vars({ t: clock, running: p, slice })
        .say(`Dispatch ${p}; it runs for min(quantum, remaining) = ${slice}.`)
        .step();

      for (let k = 0; k < slice; k++)
        gantt.set('cpu', clock + k, p).cell('cpu', clock + k, 'active');
      clock += slice;
      remaining[i]! -= slice;
      procs.set(p, 2, remaining[i]!);
      t.at('run').vars({ t: clock }).say(`${p} runs to t = ${clock}; ${remaining[i]} left.`).step();
      gantt.clearMarks();

      const joinedDuring = admit(clock);
      if (joinedDuring.length) {
        t.at('arrive')
          .say(`${joinedDuring.join(', ')} arrived during that slice — they queue ahead of ${p}.`)
          .step();
      }
      if (remaining[i]! > 0) {
        ready.enqueue(p);
        procs.cell(p, 2, 'frontier');
        t.at('requeue').say(`${p} is preempted and goes to the back of the queue.`).step();
      } else {
        finished++;
        const turnaround = clock - arrivals[i]!;
        waiting[i] = turnaround - bursts[i]!;
        procs.set(p, 3, clock).set(p, 4, waiting[i]!).cell(p, 3, 'found').cell(p, 4, 'found');
        t.at('finish')
          .vars({ finished })
          .say(
            `${p} finishes at t = ${clock}. Waiting time = turnaround ${turnaround} − burst ${bursts[i]} = ${waiting[i]}.`,
          )
          .step();
      }
    }
    const avg = waiting.reduce((a, b) => a + b, 0) / n;
    t.at('done')
      .vars({ running: undefined, slice: undefined, avgWaiting: Number(avg.toFixed(2)) })
      .say(`All done at t = ${clock}. Average waiting time = ${avg.toFixed(2)}.`)
      .emphasis('result')
      .step();
    return Number(avg.toFixed(2));
  },
});

import { z } from 'zod';
import { defineAlgorithm } from '../../define';

export default defineAlgorithm({
  id: 'lru-page-replacement',
  title: 'LRU Page Replacement',
  category: 'os',
  skillId: 'cs.os.memory',
  summary: 'On a page fault with full memory, evict the page that was used least recently.',
  difficulty: 2,
  params: z.object({
    refs: z.array(z.number().int().min(0).max(9)).min(1).max(18),
    frames: z.number().int().min(1).max(5),
  }),
  inputSpec: [
    { name: 'refs', label: 'Reference string', kind: 'int-array', hint: 'page numbers 0–9' },
    { name: 'frames', label: 'Frames', kind: 'int' },
  ],
  defaultInput: { refs: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3], frames: 3 },
  presets: [
    { label: 'Textbook', input: { refs: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3], frames: 3 } },
    { label: 'Looping (thrash)', input: { refs: [1, 2, 3, 4, 1, 2, 3, 4], frames: 3 } },
  ],
  complexity: { time: 'O(n) with a hash map + linked list', space: 'O(frames)' },

  run({ refs, frames }, t) {
    const mem = t.array(
      'frames',
      Array.from({ length: frames }, () => null),
      { label: 'memory frames' },
    );
    const log = t.table(
      'log',
      refs.map((_, i) => String(i)),
      [
        { id: 'page', label: 'page', cells: [...refs] },
        { id: 'result', label: 'hit/miss' },
      ],
      { label: 'reference log' },
    );
    const recency = t.queue('recency', {
      label: 'recency (least → most recent)',
      placement: 'side',
    });
    const slot = new Map<number, number>();
    const itemOf = new Map<number, string>();
    let faults = 0;
    let free = 0;

    t.at('init')
      .vars({ frames, faults })
      .say(`${frames} empty frames. The recency list tracks which page was used least recently.`)
      .invariant('The front of the recency list is always the eviction victim.')
      .step();

    refs.forEach((p, i) => {
      mem.clearMarks();
      log.clearMarks().column(i, 'active');
      const hit = slot.has(p);
      const full = slot.size === frames;
      t.at('access')
        .vars({ page: p, step: i })
        .say(`Reference page ${p}.`)
        .ask({
          kind: 'choice',
          prompt: `Page ${p} — hit or miss?`,
          options: ['Hit', 'Miss'],
          answer: hit ? 'Hit' : 'Miss',
          explain: hit
            ? `Page ${p} is already in frame ${slot.get(p)}.`
            : `Page ${p} is not in memory.`,
        })
        .step();

      if (hit) {
        recency.remove(itemOf.get(p)!);
        mem.cell(slot.get(p)!, 'found');
        log.set('result', i, 'H').cell('result', i, 'found');
        t.at('hit')
          .say(`Hit: page ${p} is in frame ${slot.get(p)}.`)
          .step();
      } else {
        faults++;
        log.set('result', i, 'M').cell('result', i, 'error');
        let frame: number;
        if (full) {
          const victimItem = recency.front()!;
          const victim = Number(victimItem.value);
          recency.cell(victimItem.id, 'error');
          t.at('access')
            .vars({ faults })
            .say(`Miss, and memory is full.`)
            .ask({
              kind: 'choice',
              prompt: 'Which page does LRU evict?',
              options: [...slot.keys()].sort((a, b) => a - b).map(String),
              answer: String(victim),
              explain: `Page ${victim} was used least recently.`,
            })
            .step();
          recency.dequeue();
          frame = slot.get(victim)!;
          slot.delete(victim);
          itemOf.delete(victim);
          mem.cell(frame, 'error');
          t.at('evict').say(`Evict page ${victim} from frame ${frame}.`).step();
        } else {
          frame = free++;
          t.at('access').vars({ faults }).say(`Miss — frame ${frame} is free.`).step();
        }
        slot.set(p, frame);
        mem.set(frame, p).cell(frame, 'active');
      }
      itemOf.set(p, recency.enqueue(p));
      recency.cell(itemOf.get(p)!, 'active');
      t.at('load').vars({ faults }).say(`Page ${p} is now the most recently used.`).step();
    });

    mem.clearMarks();
    log.clearMarks();
    t.at('done')
      .vars({ page: undefined, step: undefined, faults })
      .say(
        `${faults} page faults out of ${refs.length} references (hit rate ${Math.round(((refs.length - faults) / refs.length) * 100)}%).`,
      )
      .emphasis('result')
      .step();
    return faults;
  },
});

import { z } from 'zod';
import { defineAlgorithm } from '../../define';

const PAIRS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

export default defineAlgorithm({
  id: 'valid-parentheses',
  title: 'Valid Parentheses',
  category: 'stacks-queues',
  skillId: 'dsa.stacks-queues.stack',
  summary: 'Push every opener; every closer must match the opener on top of the stack.',
  difficulty: 1,
  params: z.object({
    s: z
      .string()
      .min(1)
      .max(24)
      .regex(/^[()[\]{}]+$/, 'use only ( ) [ ] { }'),
  }),
  inputSpec: [{ name: 's', label: 'Brackets', kind: 'string', hint: 'only ( ) [ ] { }' }],
  defaultInput: { s: '{[()()]}' },
  presets: [
    { label: 'Balanced', input: { s: '{[()()]}' } },
    { label: 'Wrong closer', input: { s: '([)]' } },
    { label: 'Unclosed opener', input: { s: '(()' } },
  ],
  complexity: { time: 'O(n)', space: 'O(n)' },

  run({ s }, t) {
    const chars = [...s];
    const a = t.array('s', chars, { label: 's' });
    const st = t.stack('stack', { label: 'stack', placement: 'side' });
    t.at('init')
      .say('Scan left to right. Openers wait on the stack for their closer.')
      .invariant('The stack holds the unmatched openers, innermost on top.')
      .step();

    for (let i = 0; i < chars.length; i++) {
      const c = chars[i]!;
      a.pointer('i', i, 'active');
      if (!(c in PAIRS)) {
        st.push(c);
        a.cell(i, 'frontier');
        t.at('push').vars({ i, c }).say(`'${c}' is an opener — push it.`).step();
        continue;
      }
      const top = st.peek();
      const ok = top !== undefined && top.value === PAIRS[c];
      if (top) st.cell(top.id, 'active');
      t.at('check')
        .vars({ i, c, top: top ? String(top.value) : null })
        .say(
          top
            ? `'${c}' is a closer; the top of the stack is '${top.value}'.`
            : `'${c}' is a closer, but the stack is empty.`,
        )
        .invariant('The stack holds the unmatched openers, innermost on top.')
        .ask({
          kind: 'choice',
          prompt: top
            ? `Does '${c}' close the '${top.value}' on top?`
            : `The stack is empty. Can '${c}' be matched?`,
          options: ['Yes — pop it', 'No — the string is invalid'],
          answer: ok ? 'Yes — pop it' : 'No — the string is invalid',
          explain: ok
            ? `'${top!.value}' and '${c}' form a pair.`
            : `'${c}' needs '${PAIRS[c]}' on top.`,
        })
        .step();
      if (!ok) {
        a.cell(i, 'error');
        t.at('mismatch')
          .say(`Mismatch at index ${i}: the string is not valid.`)
          .emphasis('result')
          .step();
        return false;
      }
      st.pop();
      a.cell(i, 'found');
      t.at('pop').say(`Matched '${PAIRS[c]}${c}' — pop.`).step();
    }
    a.unpointer('i');
    const valid = st.isEmpty;
    t.at('done')
      .say(
        valid
          ? 'Every opener was closed: the string is valid.'
          : `${st.size} opener${st.size > 1 ? 's were' : ' was'} never closed: invalid.`,
      )
      .emphasis('result')
      .step();
    return valid;
  },
});

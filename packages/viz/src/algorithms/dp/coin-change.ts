import { z } from 'zod';
import { defineAlgorithm } from '../../define';

export default defineAlgorithm({
  id: 'coin-change',
  title: 'Coin Change (Min Coins)',
  category: 'dp',
  skillId: 'dsa.dp.1d',
  summary:
    'dp[x] = fewest coins that make x. Build it bottom-up: each amount reuses the answers for smaller amounts.',
  difficulty: 3,
  params: z.object({
    coins: z.array(z.number().int().min(1).max(50)).min(1).max(5),
    amount: z.number().int().min(1).max(24),
  }),
  inputSpec: [
    { name: 'coins', label: 'Coins', kind: 'int-array', hint: 'up to 5 denominations' },
    { name: 'amount', label: 'Amount', kind: 'int', hint: '1–24' },
  ],
  defaultInput: { coins: [1, 3, 4], amount: 6 },
  presets: [
    { label: 'Greedy fails', input: { coins: [1, 3, 4], amount: 6 } },
    { label: 'Impossible amount', input: { coins: [5, 7], amount: 9 } },
    { label: 'Bigger table', input: { coins: [1, 5, 6, 9], amount: 11 } },
  ],
  complexity: { time: 'O(amount × coins)', space: 'O(amount)' },

  run({ coins, amount }, t) {
    const INF = Infinity;
    const dp: number[] = [0, ...Array.from({ length: amount }, () => INF)];
    const cols = dp.map((_, x) => String(x));
    const table = t.table(
      'dp',
      cols,
      [{ id: 'dp', label: 'dp[x]', cells: dp.map((v) => (v === INF ? '∞' : v)) }],
      { label: 'dp table (amount →)' },
    );
    const cs = t.array('coins', coins, { label: 'coins', placement: 'side' });
    const show = (v: number) => (v === INF ? '∞' : v);

    table.cell('dp', 0, 'found');
    t.at('init')
      .vars({ amount })
      .say('dp[0] = 0 (no coins make 0). Every other amount starts at ∞ (not yet reachable).')
      .invariant('dp[y] is final for every y < x.')
      .step();

    for (let x = 1; x <= amount; x++) {
      table.clearMarks().cell('dp', x, 'active');
      for (let k = 0; k < coins.length; k++) {
        const c = coins[k]!;
        cs.clearMarks().pointer('c', k, 'active');
        if (c > x) {
          t.at('try')
            .vars({ x, c, 'dp[x]': show(dp[x]!) })
            .say(`Coin ${c} is larger than ${x} — it cannot be used.`)
            .step();
          continue;
        }
        const cand = dp[x - c]! + 1;
        const better = cand < dp[x]!;
        table.cell('dp', x - c, 'candidate');
        t.at('try')
          .vars({ x, c, 'dp[x]': show(dp[x]!) })
          .say(
            `Use coin ${c}: dp[${x - c}] + 1 = ${show(dp[x - c]!)}${dp[x - c] === INF ? '' : ' + 1 = ' + cand} vs dp[${x}] = ${show(dp[x]!)}.`,
          )
          .invariant('dp[y] is final for every y < x.')
          .ask({
            kind: 'choice',
            prompt: `dp[${x - c}] = ${show(dp[x - c]!)}. Does coin ${c} improve dp[${x}] = ${show(dp[x]!)}?`,
            options: ['Yes', 'No'],
            answer: better ? 'Yes' : 'No',
            explain: better
              ? `${cand} < ${show(dp[x]!)}.`
              : dp[x - c] === INF
                ? `${x - c} is unreachable, so ${x} cannot be made this way.`
                : `${cand} ≥ ${show(dp[x]!)}.`,
          })
          .step();
        if (better) {
          dp[x] = cand;
          table.set('dp', x, cand).cell('dp', x, 'found');
          t.at('improve').vars({ 'dp[x]': cand }).say(`dp[${x}] = ${cand}.`).step();
          table.cell('dp', x, 'active');
        }
        table.uncell('dp', x - c);
        table.cell('dp', x, 'active');
      }
      table.cell('dp', x, 'visited');
    }
    cs.clearMarks();
    table.clearMarks().cell('dp', amount, dp[amount] === INF ? 'error' : 'found');
    const result = dp[amount] === INF ? -1 : dp[amount]!;
    t.at('done')
      .vars({ x: undefined, c: undefined, 'dp[x]': undefined })
      .say(
        result === -1
          ? `${amount} cannot be made from these coins: −1.`
          : `Fewest coins for ${amount}: ${result}.`,
      )
      .emphasis('result')
      .step();
    return result;
  },
});

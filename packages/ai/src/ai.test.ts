import { afterEach, describe, expect, it, vi } from 'vitest';
import { INTERVIEW_QUESTIONS } from '@careerforge/content';
import { aiMode, fixtureJudge, judgeExplanation, judgeRound } from './index';

const q = INTERVIEW_QUESTIONS.find((x) => x.slug === 'iq-longest-k-distinct')!;

describe('fixture judge (no LLM)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is the default without an API key', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    vi.stubEnv('AI_MODE', '');
    expect(aiMode()).toBe('fixtures');
  });

  it('a strong answer outranks a weak one on every dimension that matters', () => {
    const strong = fixtureJudge(
      q,
      'I would use a sliding window with two pointers and a hash map counting frequency of each value. Expand right; when there are more than k distinct keys, shrink from the left and decrement counts, deleting zero keys. Track the best length. Each index enters and leaves once, so O(n) time and O(k) space. Edge cases: k = 0 returns 0, an empty array returns 0.',
      'For a stream I would keep the same window but only store the counts.',
    );
    const weak = fixtureJudge(q, 'Check every subarray.');
    const rank = { weak: 0, developing: 1, solid: 2, strong: 3 };
    const by = (j: typeof strong, d: string) =>
      rank[j.levels.find((l) => l.dimension === d)!.level];
    for (const d of ['approach', 'complexity', 'edge_cases', 'communication'])
      expect(by(strong, d)).toBeGreaterThan(by(weak, d));
    expect(strong.levels).toHaveLength(5);
  });

  it('emits levels only — never numbers', async () => {
    vi.stubEnv('AI_MODE', 'fixtures');
    const r = await judgeRound(q, 'sliding window with a hash map, O(n)', '');
    for (const l of r.levels) expect(['weak', 'developing', 'solid', 'strong']).toContain(l.level);
    expect(JSON.stringify(r)).not.toMatch(/"score"/);
  });

  it('grades explanations by key-point coverage', async () => {
    vi.stubEnv('AI_MODE', 'fixtures');
    const good = await judgeExplanation({
      prompt: 'p',
      keyPoints: ['sorted', 'invariant', 'half', 'O(log n)'],
      answer:
        'Because the array is sorted, each comparison discards half. The invariant is that the target is within lo..hi, so it runs in O(log n).',
    });
    const bad = await judgeExplanation({
      prompt: 'p',
      keyPoints: ['sorted', 'invariant', 'half', 'O(log n)'],
      answer: 'It searches.',
    });
    expect(good.level).toBe('strong');
    expect(bad.level).toBe('weak');
  });
});

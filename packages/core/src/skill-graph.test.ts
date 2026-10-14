import { describe, expect, it } from 'vitest';
import {
  findPrereqCycle,
  findTaxonomyProblems,
  flattenSkills,
  prerequisitesOf,
  topoOrder,
  type FlatTaxonomy,
} from './skill-graph';

const file = {
  version: 1,
  domains: [
    {
      domain: 'dsa' as const,
      skills: [
        {
          slug: 'dsa.arrays',
          name: 'Arrays',
          summary: '',
          requires: [],
          reinforces: [],
          children: [
            {
              slug: 'dsa.arrays.traversal',
              name: 'Traversal',
              summary: '',
              requires: [],
              reinforces: [],
            },
            {
              slug: 'dsa.arrays.two-pointers',
              name: 'Two pointers',
              summary: '',
              requires: ['dsa.arrays.traversal'],
              reinforces: [],
            },
          ],
        },
        {
          slug: 'dsa.graphs',
          name: 'Graphs',
          summary: '',
          requires: ['dsa.arrays'],
          reinforces: [],
        },
      ],
    },
  ],
};

describe('flattenSkills', () => {
  it('flattens pre-order with parent, depth and sibling sort', () => {
    const { skills, edges } = flattenSkills(file);
    expect(skills.map((s) => [s.slug, s.parentSlug, s.depth, s.sort])).toEqual([
      ['dsa.arrays', null, 0, 0],
      ['dsa.arrays.traversal', 'dsa.arrays', 1, 0],
      ['dsa.arrays.two-pointers', 'dsa.arrays', 1, 1],
      ['dsa.graphs', null, 0, 1],
    ]);
    expect(edges).toEqual([
      { from: 'dsa.arrays.traversal', to: 'dsa.arrays.two-pointers', kind: 'prereq', strength: 1 },
      { from: 'dsa.arrays', to: 'dsa.graphs', kind: 'prereq', strength: 1 },
    ]);
  });

  it('valid taxonomy has no problems', () => {
    expect(findTaxonomyProblems(flattenSkills(file))).toEqual([]);
  });
});

describe('findTaxonomyProblems', () => {
  const base = (): FlatTaxonomy => flattenSkills(file);

  it('reports unknown edge endpoints', () => {
    const t = base();
    t.edges.push({ from: 'dsa.nope', to: 'dsa.graphs', kind: 'prereq', strength: 1 });
    expect(findTaxonomyProblems(t)).toContain('edge references unknown skill "dsa.nope"');
  });

  it('reports duplicates and bad parent prefixes', () => {
    const t = base();
    t.skills.push({ ...t.skills[0]!, sort: 9 });
    t.skills.push({ ...t.skills[3]!, slug: 'cs.os', parentSlug: 'dsa.graphs' });
    const problems = findTaxonomyProblems(t);
    expect(problems).toContain('duplicate skill slug "dsa.arrays"');
    expect(problems).toContain('"cs.os" must be prefixed by its parent "dsa.graphs."');
  });

  it('reports prerequisite cycles with the cycle path', () => {
    const t = base();
    t.edges.push({ from: 'dsa.graphs', to: 'dsa.arrays', kind: 'prereq', strength: 1 });
    const problems = findTaxonomyProblems(t);
    expect(
      problems.some((p) =>
        p.startsWith('prerequisite cycle: dsa.arrays → dsa.graphs → dsa.arrays'),
      ),
    ).toBe(true);
  });

  it('ignores cycles made of reinforces edges', () => {
    const t = base();
    t.edges.push({ from: 'dsa.graphs', to: 'dsa.arrays', kind: 'reinforces', strength: 0.5 });
    expect(findTaxonomyProblems(t)).toEqual([]);
  });
});

describe('topoOrder', () => {
  it('respects edges and breaks ties by input order', () => {
    const order = topoOrder(
      ['c', 'a', 'b', 'd'],
      [
        { from: 'a', to: 'b' },
        { from: 'c', to: 'd' },
      ],
    );
    expect(order).toEqual(['c', 'a', 'b', 'd']);
  });

  it('is deterministic and valid on a random DAG', () => {
    const nodes = Array.from({ length: 40 }, (_, i) => `n${i}`);
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    const edges: { from: string; to: string }[] = [];
    for (let i = 0; i < 40; i++)
      for (let j = i + 1; j < 40; j++)
        if (rnd() < 0.1) edges.push({ from: nodes[i]!, to: nodes[j]! });
    const order = topoOrder(nodes, edges);
    const pos = new Map(order.map((n, i) => [n, i]));
    for (const e of edges) expect(pos.get(e.from)!).toBeLessThan(pos.get(e.to)!);
    expect(topoOrder(nodes, edges)).toEqual(order);
  });

  it('throws on cycles', () => {
    expect(() =>
      topoOrder(
        ['a', 'b'],
        [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'a' },
        ],
      ),
    ).toThrow(/cycle/);
  });
});

describe('findPrereqCycle / prerequisitesOf', () => {
  it('returns null for a DAG', () => {
    expect(
      findPrereqCycle(
        ['a', 'b', 'c'],
        [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
        ],
      ),
    ).toBeNull();
  });

  it('collects transitive prerequisites nearest-first and ignores reinforces', () => {
    const edges = [
      { from: 'a', to: 'b', kind: 'prereq' as const },
      { from: 'b', to: 'c', kind: 'prereq' as const },
      { from: 'x', to: 'c', kind: 'reinforces' as const },
    ];
    expect(prerequisitesOf('c', edges)).toEqual(['b', 'a']);
  });
});

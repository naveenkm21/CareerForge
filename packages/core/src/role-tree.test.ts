import { describe, expect, it } from 'vitest';
import { buildRoleTree, flattenNode, type TaxonomySkill } from './role-tree';

const sk = (
  id: string,
  parentId: string | null,
  domain: TaxonomySkill['domain'] = 'dsa',
  sort = 0,
): TaxonomySkill => ({
  id,
  slug: id,
  name: id,
  summary: '',
  domain,
  parentId,
  depth: parentId ? 1 : 0,
  sort,
});

const skills = [
  sk('dsa.arrays', null),
  sk('dsa.arrays.traversal', 'dsa.arrays', 'dsa', 0),
  sk('dsa.arrays.prefix-sum', 'dsa.arrays', 'dsa', 1),
  sk('dsa.graphs', null, 'dsa', 1),
  sk('cs.os', null, 'cs'),
];

describe('buildRoleTree', () => {
  it('prunes to required skills but keeps ancestors', () => {
    const tree = buildRoleTree(skills, [
      { skillId: 'dsa.arrays.traversal', tier: 'core', weight: 1, targetMastery: 0.8 },
      { skillId: 'cs.os', tier: 'strong', weight: 0.5, targetMastery: 0.6 },
    ]);
    expect(tree.map((d) => d.domain)).toEqual(['dsa', 'cs']);
    const dsa = tree[0]!;
    expect(dsa.nodes.map((n) => n.skill.id)).toEqual(['dsa.arrays']);
    expect(dsa.nodes[0]!.requirement).toBeNull();
    expect(dsa.nodes[0]!.children.map((c) => c.skill.id)).toEqual(['dsa.arrays.traversal']);
    expect(dsa.requiredCount).toBe(1);
  });

  it('with no evidence every node is unmeasured — no fabricated scores', () => {
    const tree = buildRoleTree(skills, [
      { skillId: 'dsa.arrays.traversal', tier: 'core', weight: 1, targetMastery: 0.8 },
      { skillId: 'dsa.arrays.prefix-sum', tier: 'core', weight: 1, targetMastery: 0.8 },
    ]);
    const all = tree.flatMap((d) => d.nodes.flatMap(flattenNode));
    expect(all.every((n) => n.state === null)).toBe(true);
    expect(tree[0]!.measuredCount).toBe(0);
  });

  it('counts measured skills from states with evidence', () => {
    const tree = buildRoleTree(
      skills,
      [{ skillId: 'dsa.graphs', tier: 'core', weight: 1, targetMastery: 0.8 }],
      [
        {
          skillId: 'dsa.graphs',
          mastery: 0.4,
          confidence: 0.2,
          status: 'learning',
          evidenceCount: 3,
        },
      ],
    );
    expect(tree[0]!.measuredCount).toBe(1);
    expect(tree[0]!.nodes[0]!.state?.mastery).toBe(0.4);
  });
});

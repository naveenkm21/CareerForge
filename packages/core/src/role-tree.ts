import type { RoleTier, SkillDomain } from '@careerforge/contracts';

import type { SkillStatus } from './scoring/mastery';
export type { SkillStatus };

export type TaxonomySkill = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  domain: SkillDomain;
  parentId: string | null;
  depth: number;
  sort: number;
};

export type RoleRequirement = {
  skillId: string;
  tier: RoleTier;
  weight: number;
  targetMastery: number;
};

/** A projection row. Absent means "no evidence yet" — never a fabricated zero-confidence score. */
export type SkillStateView = {
  skillId: string;
  mastery: number;
  confidence: number;
  status: SkillStatus;
  evidenceCount: number;
};

export type RoleTreeNode = {
  skill: TaxonomySkill;
  requirement: RoleRequirement | null;
  state: SkillStateView | null;
  /** Requirement on this node or any descendant. */
  required: boolean;
  children: RoleTreeNode[];
};

export type RoleTreeDomain = {
  domain: SkillDomain;
  nodes: RoleTreeNode[];
  requiredCount: number;
  measuredCount: number;
};

export const DOMAIN_LABELS: Record<SkillDomain, string> = {
  dsa: 'Data Structures & Algorithms',
  cs: 'CS Fundamentals',
  dev: 'Development',
  soft: 'Communication',
};

const DOMAIN_ORDER: SkillDomain[] = ['dsa', 'cs', 'dev', 'soft'];

/**
 * Builds the navigation tree for a role, pruned to the skills the role actually requires
 * (plus their ancestors, so the tree stays navigable). Pure: the caller supplies rows.
 */
export function buildRoleTree(
  skills: TaxonomySkill[],
  requirements: RoleRequirement[],
  states: SkillStateView[] = [],
): RoleTreeDomain[] {
  const reqBySkill = new Map(requirements.map((r) => [r.skillId, r]));
  const stateBySkill = new Map(states.map((s) => [s.skillId, s]));
  const childrenOf = new Map<string | null, TaxonomySkill[]>();
  for (const s of skills) {
    const list = childrenOf.get(s.parentId) ?? [];
    list.push(s);
    childrenOf.set(s.parentId, list);
  }
  for (const list of childrenOf.values())
    list.sort((a, b) => a.sort - b.sort || a.slug.localeCompare(b.slug));

  const build = (skill: TaxonomySkill): RoleTreeNode | null => {
    const children = (childrenOf.get(skill.id) ?? [])
      .map(build)
      .filter((n): n is RoleTreeNode => n !== null);
    const requirement = reqBySkill.get(skill.id) ?? null;
    const required = requirement !== null || children.some((c) => c.required);
    if (!required) return null;
    return { skill, requirement, state: stateBySkill.get(skill.id) ?? null, required, children };
  };

  const roots = childrenOf.get(null) ?? [];
  return DOMAIN_ORDER.map((domain) => {
    const nodes = roots
      .filter((s) => s.domain === domain)
      .map(build)
      .filter((n): n is RoleTreeNode => n !== null);
    const flat = nodes.flatMap(flattenNode);
    return {
      domain,
      nodes,
      requiredCount: flat.filter((n) => n.requirement).length,
      measuredCount: flat.filter((n) => n.requirement && n.state && n.state.evidenceCount > 0)
        .length,
    };
  }).filter((d) => d.nodes.length > 0);
}

export function flattenNode(node: RoleTreeNode): RoleTreeNode[] {
  return [node, ...node.children.flatMap(flattenNode)];
}

export const TIER_LABELS: Record<RoleTier, string> = {
  core: 'Core',
  strong: 'Strong',
  nice: 'Nice to have',
};

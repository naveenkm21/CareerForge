import 'server-only';
import {
  buildRoleTree,
  prerequisitesOf,
  topoOrder,
  type RoleTreeDomain,
  type TaxonomySkill,
} from '@careerforge/core';
import {
  getPrimaryEnrollment,
  getRoleTaxonomy,
  listAlgorithmsBySkill,
  loadScoringContext,
  type Role,
} from '@careerforge/db';

export type RoleTreeData = {
  role: Role;
  domains: RoleTreeDomain[];
  skillById: Map<string, TaxonomySkill>;
  directPrereqs: Map<string, string[]>;
  visualizations: Map<string, { registryId: string; title: string }[]>;
  /** Required skills with no required prerequisites, ranked by how many required skills they unlock. */
  entryPoints: (TaxonomySkill & { unlocks: number })[];
  requiredCount: number;
};

/**
 * Everything the dashboard and /skills need for the user's primary role. Pure assembly over
 * repository rows — the tree shape and ordering come from packages/core.
 */
export async function loadRoleTree(userId: string): Promise<RoleTreeData | null> {
  const enrollment = await getPrimaryEnrollment(userId);
  if (!enrollment) return null;
  const [{ skills, requirements, edges }, visualizations, ctx] = await Promise.all([
    getRoleTaxonomy(enrollment.role.id),
    listAlgorithmsBySkill(),
    loadScoringContext(userId),
  ]);
  // Fresh projections from the evidence log; skills without evidence stay "not measured".
  const states = [...ctx.states.values()].map((p) => ({
    skillId: p.skillId,
    mastery: p.mastery,
    confidence: p.confidence,
    status: p.status,
    evidenceCount: p.evidenceCount,
  }));
  const domains = buildRoleTree(skills, requirements, states);
  const skillById = new Map(skills.map((s) => [s.id, s]));

  const prereqEdges = edges.filter((e) => e.kind === 'prereq');
  const directPrereqs = new Map<string, string[]>();
  for (const e of prereqEdges)
    directPrereqs.set(e.to, [...(directPrereqs.get(e.to) ?? []), e.from]);

  const required = new Set(requirements.map((r) => r.skillId));
  const order = topoOrder(
    skills.map((s) => s.id),
    prereqEdges,
  );
  const position = new Map(order.map((id, i) => [id, i]));
  // unlocks(x) = required skills that have x among their transitive prerequisites.
  const prereqsOf = new Map(
    [...required].map((id) => [id, new Set(prerequisitesOf(id, prereqEdges))]),
  );
  const unlocks = (id: string) => [...required].filter((r) => prereqsOf.get(r)!.has(id)).length;
  const entryPoints = order
    .filter((id) => required.has(id) && ![...prereqsOf.get(id)!].some((p) => required.has(p)))
    .map((id) => ({ ...skillById.get(id)!, unlocks: unlocks(id) }))
    .sort((a, b) => b.unlocks - a.unlocks || position.get(a.id)! - position.get(b.id)!)
    .slice(0, 4);

  return {
    role: enrollment.role,
    domains,
    skillById,
    directPrereqs,
    visualizations,
    entryPoints,
    requiredCount: required.size,
  };
}

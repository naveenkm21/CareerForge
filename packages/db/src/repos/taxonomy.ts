import { asc, eq } from 'drizzle-orm';
import type { RoleRequirement, TaxonomySkill } from '@careerforge/core';
import { getDb } from '../client';
import { algorithms, roleSkillReqs, roles, skillEdges, skills } from '../schema';

export async function listRoles() {
  return getDb().select().from(roles).orderBy(asc(roles.title));
}

export async function listSkills(): Promise<TaxonomySkill[]> {
  const rows = await getDb().select().from(skills).orderBy(asc(skills.depth), asc(skills.sort));
  return rows.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    summary: s.summary,
    domain: s.domain,
    parentId: s.parentId,
    depth: s.depth,
    sort: s.sort,
  }));
}

export async function listSkillEdges() {
  const db = getDb();
  return db
    .select({
      from: skillEdges.fromSkillId,
      to: skillEdges.toSkillId,
      kind: skillEdges.kind,
      strength: skillEdges.strength,
    })
    .from(skillEdges);
}

export async function getRoleRequirements(roleId: string): Promise<RoleRequirement[]> {
  const rows = await getDb().select().from(roleSkillReqs).where(eq(roleSkillReqs.roleId, roleId));
  return rows.map((r) => ({
    skillId: r.skillId,
    tier: r.tier,
    weight: r.weight,
    targetMastery: r.targetMastery,
  }));
}

/** Everything the role skill tree needs, in parallel. */
export async function getRoleTaxonomy(roleId: string) {
  const [allSkills, requirements, edges] = await Promise.all([
    listSkills(),
    getRoleRequirements(roleId),
    listSkillEdges(),
  ]);
  return { skills: allSkills, requirements, edges };
}

/** Algorithm registry ids grouped by skill id — used to link a skill to its visualizations. */
export async function listAlgorithmsBySkill(): Promise<
  Map<string, { registryId: string; title: string }[]>
> {
  const rows = await getDb()
    .select({
      skillId: algorithms.skillId,
      registryId: algorithms.registryId,
      title: algorithms.title,
    })
    .from(algorithms)
    .orderBy(asc(algorithms.title));
  const map = new Map<string, { registryId: string; title: string }[]>();
  for (const r of rows) {
    const list = map.get(r.skillId) ?? [];
    list.push({ registryId: r.registryId, title: r.title });
    map.set(r.skillId, list);
  }
  return map;
}

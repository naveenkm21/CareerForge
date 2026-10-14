import { eq, sql } from 'drizzle-orm';
import type { Database } from '../client';
import { algorithms, featureFlags, roleSkillReqs, roles, skillEdges, skills } from '../schema';
import type { ContentBundle } from './content';
import { seedCurriculum } from './curriculum';

export type SeedReport = {
  skills: number;
  edges: number;
  roles: number;
  requirements: number;
  flagsInserted: number;
  algorithms: number;
  problems: number;
  topics: number;
  orphanedSkills: string[];
};

/**
 * Idempotent: every row is upserted by its natural key (slug / registry id), and the derived
 * relation tables (edges, requirements) are replaced wholesale inside one transaction. Running
 * it twice yields identical rows and ids. Feature flags are insert-only so production toggles
 * are never reverted by a deploy.
 */
export async function seedContent(db: Database, content: ContentBundle): Promise<SeedReport> {
  return db.transaction(async (tx) => {
    const idBySlug = new Map<string, string>();
    for (const s of content.taxonomy.skills) {
      const [row] = await tx
        .insert(skills)
        .values({
          slug: s.slug,
          name: s.name,
          domain: s.domain,
          depth: s.depth,
          sort: s.sort,
          summary: s.summary,
          icon: s.icon,
        })
        .onConflictDoUpdate({
          target: skills.slug,
          set: {
            name: s.name,
            domain: s.domain,
            depth: s.depth,
            sort: s.sort,
            summary: s.summary,
            icon: s.icon,
          },
        })
        .returning({ id: skills.id });
      idBySlug.set(s.slug, row!.id);
    }
    for (const s of content.taxonomy.skills) {
      const parentId = s.parentSlug ? idBySlug.get(s.parentSlug)! : null;
      await tx
        .update(skills)
        .set({ parentId })
        .where(eq(skills.id, idBySlug.get(s.slug)!));
    }

    const allSkills = await tx.select({ slug: skills.slug }).from(skills);
    const orphanedSkills = allSkills.map((r) => r.slug).filter((slug) => !idBySlug.has(slug));

    await tx.delete(skillEdges);
    if (content.taxonomy.edges.length) {
      await tx.insert(skillEdges).values(
        content.taxonomy.edges.map((e) => ({
          fromSkillId: idBySlug.get(e.from)!,
          toSkillId: idBySlug.get(e.to)!,
          kind: e.kind,
          strength: e.strength,
        })),
      );
    }

    let requirements = 0;
    for (const role of content.roles) {
      const [row] = await tx
        .insert(roles)
        .values({
          slug: role.slug,
          title: role.title,
          family: role.family,
          description: role.description,
        })
        .onConflictDoUpdate({
          target: roles.slug,
          set: { title: role.title, family: role.family, description: role.description },
        })
        .returning({ id: roles.id });
      await tx.delete(roleSkillReqs).where(eq(roleSkillReqs.roleId, row!.id));
      if (role.requirements.length) {
        await tx.insert(roleSkillReqs).values(
          role.requirements.map((r) => ({
            roleId: row!.id,
            skillId: idBySlug.get(r.skill)!,
            tier: r.tier,
            weight: r.weight,
            targetMastery: r.target,
          })),
        );
      }
      requirements += role.requirements.length;
    }

    let flagsInserted = 0;
    for (const f of content.flags) {
      const inserted = await tx
        .insert(featureFlags)
        .values({
          key: f.key,
          description: f.description,
          enabled: f.enabled,
          rolloutPct: f.rolloutPct,
        })
        .onConflictDoUpdate({ target: featureFlags.key, set: { description: f.description } })
        .returning({ inserted: sql<boolean>`(xmax = 0)` });
      if (inserted[0]?.inserted) flagsInserted++;
    }

    for (const a of content.algorithms) {
      const values = {
        registryId: a.registryId,
        title: a.title,
        skillId: idBySlug.get(a.skillSlug)!,
        structureKinds: a.structureKinds,
        complexity: a.complexity,
      };
      await tx
        .insert(algorithms)
        .values(values)
        .onConflictDoUpdate({
          target: algorithms.registryId,
          set: {
            title: values.title,
            skillId: values.skillId,
            structureKinds: values.structureKinds,
            complexity: values.complexity,
          },
        });
    }

    await seedCurriculum(tx, content.curriculum, idBySlug);

    return {
      skills: content.taxonomy.skills.length,
      edges: content.taxonomy.edges.length,
      roles: content.roles.length,
      requirements,
      flagsInserted,
      algorithms: content.algorithms.length,
      problems: content.curriculum.problems.length,
      topics: content.curriculum.topics.length,
      orphanedSkills,
    };
  });
}

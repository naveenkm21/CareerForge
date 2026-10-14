import { z } from 'zod';

/** Skill slugs are dotted paths: `dsa.searching.binary-search`. */
export const skillSlug = z
  .string()
  .regex(/^[a-z][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)*$/, 'skill slugs are dotted lowercase paths');

export const skillDomain = z.enum(['dsa', 'cs', 'dev', 'soft']);
export type SkillDomain = z.infer<typeof skillDomain>;

export const skillEdgeKind = z.enum(['prereq', 'reinforces']);
export type SkillEdgeKind = z.infer<typeof skillEdgeKind>;

export const roleTier = z.enum(['core', 'strong', 'nice']);
export type RoleTier = z.infer<typeof roleTier>;

export const skillSeed = z.object({
  slug: skillSlug,
  name: z.string().min(1),
  summary: z.string().default(''),
  icon: z.string().optional(),
  /** Prerequisite skill slugs. `requires: [a]` means edge a → this. */
  requires: z.array(skillSlug).default([]),
  reinforces: z.array(skillSlug).default([]),
});
export type SkillSeed = z.infer<typeof skillSeed>;

/** content/skills.yaml — the navigation tree is the nesting; prerequisites are explicit. */
export type SkillTreeSeed = SkillSeed & { children?: SkillTreeSeed[] };
export const skillTreeSeed: z.ZodType<SkillTreeSeed, z.ZodTypeDef, unknown> = skillSeed.extend({
  children: z.lazy(() => z.array(skillTreeSeed)).optional(),
}) as z.ZodType<SkillTreeSeed, z.ZodTypeDef, unknown>;

export const skillsFile = z.object({
  version: z.number().int().positive(),
  domains: z.array(
    z.object({
      domain: skillDomain,
      skills: z.array(skillTreeSeed),
    }),
  ),
});
export type SkillsFile = z.infer<typeof skillsFile>;

export const roleSeed = z.object({
  slug: z.string().regex(/^[a-z][a-z0-9-]*$/),
  title: z.string().min(1),
  family: z.string().min(1),
  description: z.string().default(''),
  requirements: z.array(
    z.object({
      skill: skillSlug,
      tier: roleTier,
      weight: z.number().min(0).max(1),
      target: z.number().min(0).max(1),
    }),
  ),
});
export type RoleSeed = z.infer<typeof roleSeed>;

export const rolesFile = z.object({
  version: z.number().int().positive(),
  roles: z.array(roleSeed),
});
export type RolesFile = z.infer<typeof rolesFile>;

export const featureFlagSeed = z.object({
  key: z.string().regex(/^[a-z][a-z0-9.-]*$/),
  description: z.string(),
  enabled: z.boolean(),
  rolloutPct: z.number().int().min(0).max(100).default(100),
});
export const flagsFile = z.object({ flags: z.array(featureFlagSeed) });
export type FeatureFlagSeed = z.infer<typeof featureFlagSeed>;

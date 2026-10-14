import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import {
  flagsFile,
  rolesFile,
  skillsFile,
  type FeatureFlagSeed,
  type RoleSeed,
} from '@careerforge/contracts';
import { assertValidTaxonomy, flattenSkills, type FlatTaxonomy } from '@careerforge/core';
import { listAlgorithms } from '@careerforge/viz';
import { JOBS, PROBLEMS, QUESTIONS, TOPICS, INTERVIEW_QUESTIONS } from '@careerforge/content';

export type AlgorithmSeed = {
  registryId: string;
  title: string;
  skillSlug: string;
  structureKinds: string[];
  complexity: { time: string; space: string };
};

export type ContentBundle = {
  taxonomy: FlatTaxonomy;
  roles: RoleSeed[];
  flags: FeatureFlagSeed[];
  algorithms: AlgorithmSeed[];
  curriculum: {
    topics: typeof TOPICS;
    problems: typeof PROBLEMS;
    questions: typeof QUESTIONS;
    jobs: typeof JOBS;
  };
};

export function contentDir(): string {
  return process.env.CONTENT_DIR ?? fileURLToPath(new URL('../../../../content/', import.meta.url));
}

function readYaml(file: string): unknown {
  return parse(readFileSync(join(contentDir(), file), 'utf8'));
}

/**
 * Loads and cross-validates all seed content. Throws with every problem listed, so a bad YAML
 * edit fails CI rather than half-seeding production.
 */
export function loadContent(): ContentBundle {
  const taxonomy = flattenSkills(skillsFile.parse(readYaml('skills.yaml')));
  assertValidTaxonomy(taxonomy);
  const slugs = new Set(taxonomy.skills.map((s) => s.slug));

  const { roles } = rolesFile.parse(readYaml('roles.yaml'));
  const { flags } = flagsFile.parse(readYaml('flags.yaml'));

  const algorithms: AlgorithmSeed[] = listAlgorithms().map((a) => ({
    registryId: a.id,
    title: a.title,
    skillSlug: a.skillId,
    structureKinds: a.structureKinds,
    complexity: a.complexity,
  }));

  const problems: string[] = [];
  const roleSlugs = new Set<string>();
  for (const role of roles) {
    if (roleSlugs.has(role.slug)) problems.push(`duplicate role "${role.slug}"`);
    roleSlugs.add(role.slug);
    const seen = new Set<string>();
    for (const req of role.requirements) {
      if (!slugs.has(req.skill))
        problems.push(`role "${role.slug}" requires unknown skill "${req.skill}"`);
      if (seen.has(req.skill)) problems.push(`role "${role.slug}" lists "${req.skill}" twice`);
      seen.add(req.skill);
    }
  }
  for (const a of algorithms) {
    if (!slugs.has(a.skillSlug))
      problems.push(`algorithm "${a.registryId}" maps to unknown skill "${a.skillSlug}"`);
  }
  // Curriculum cross-references: every skill, algorithm, problem and question must exist.
  const algoIds = new Set(algorithms.map((a) => a.registryId));
  const problemSlugs = new Set(PROBLEMS.map((p) => p.slug));
  const questionSlugs = new Set(QUESTIONS.map((q) => q.slug));
  for (const p of PROBLEMS) {
    if (!slugs.has(p.skill))
      problems.push(`problem "${p.slug}" maps to unknown skill "${p.skill}"`);
    if (p.algorithmId && !algoIds.has(p.algorithmId))
      problems.push(`problem "${p.slug}" links unknown algorithm "${p.algorithmId}"`);
  }
  for (const q of [...QUESTIONS, ...INTERVIEW_QUESTIONS])
    if (!slugs.has(q.skill))
      problems.push(`question "${q.slug}" maps to unknown skill "${q.skill}"`);
  for (const t of TOPICS) {
    if (!slugs.has(t.skill)) problems.push(`topic "${t.slug}" maps to unknown skill "${t.skill}"`);
    for (const l of t.lessons)
      for (const b of l.blocks) {
        if (b.kind === 'viz' && !algoIds.has(b.algorithmId))
          problems.push(`topic "${t.slug}" uses unknown algorithm "${b.algorithmId}"`);
        if (b.kind === 'problem' && !problemSlugs.has(b.problemSlug))
          problems.push(`topic "${t.slug}" uses unknown problem "${b.problemSlug}"`);
        if (b.kind === 'quiz' && !questionSlugs.has(b.questionSlug))
          problems.push(`topic "${t.slug}" uses unknown question "${b.questionSlug}"`);
      }
  }
  for (const j of JOBS)
    if (!roleSlugs.has(j.roleSlug))
      problems.push(`job "${j.externalId}" uses unknown role "${j.roleSlug}"`);
  if (problems.length) throw new Error(`Invalid content:\n  - ${problems.join('\n  - ')}`);

  return {
    taxonomy,
    roles,
    flags,
    algorithms,
    curriculum: { topics: TOPICS, problems: PROBLEMS, questions: QUESTIONS, jobs: JOBS },
  };
}

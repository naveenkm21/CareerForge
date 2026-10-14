import { describe, expect, it } from 'vitest';
import { loadContent } from './content';

describe('content/ seed files', () => {
  const content = loadContent();

  it('parse and cross-validate', () => {
    expect(content.taxonomy.skills.length).toBeGreaterThan(40);
    expect(content.roles.map((r) => r.slug)).toEqual(['sde', 'frontend', 'backend', 'data-ml']);
  });

  it('every visualized algorithm maps to a skill that some role requires or that has a required ancestor', () => {
    const required = new Set(content.roles.flatMap((r) => r.requirements.map((q) => q.skill)));
    for (const a of content.algorithms) {
      const chain = a.skillSlug.split('.').map((_, i, parts) => parts.slice(0, i + 1).join('.'));
      expect(
        chain.some((s) => required.has(s)),
        `${a.registryId} → ${a.skillSlug}`,
      ).toBe(true);
    }
  });

  it('the two roles produce materially different weight vectors', () => {
    const [sde, fe] = content.roles;
    const sdeSkills = new Set(sde!.requirements.map((r) => r.skill));
    const feOnly = fe!.requirements.filter((r) => !sdeSkills.has(r.skill));
    expect(feOnly.length).toBeGreaterThan(5);
  });
});

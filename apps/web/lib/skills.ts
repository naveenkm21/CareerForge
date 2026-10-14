import 'server-only';
import { cache } from 'react';
import { listSkills } from '@careerforge/db';

const skillMap = cache(async () => new Map((await listSkills()).map((s) => [s.slug, s.id])));

export async function skillIdForSlug(slug: string): Promise<string | null> {
  return (await skillMap()).get(slug) ?? null;
}

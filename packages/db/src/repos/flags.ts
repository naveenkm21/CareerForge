import { evaluateFlags, type FlagRow } from '@careerforge/core';
import { getDb } from '../client';
import { featureFlags } from '../schema';

export async function listFlags(): Promise<FlagRow[]> {
  const rows = await getDb().select().from(featureFlags);
  return rows.map((r) => ({
    key: r.key,
    enabled: r.enabled,
    rolloutPct: r.rolloutPct,
    allowlist: r.allowlist,
  }));
}

/** Evaluates every flag for a subject (user id, or null for anonymous visitors). */
export async function getFlagsFor(subject: string | null): Promise<Record<string, boolean>> {
  return evaluateFlags(await listFlags(), subject);
}

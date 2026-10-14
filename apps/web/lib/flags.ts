import 'server-only';
import { getFlagsFor, isDatabaseConfigured } from '@careerforge/db';

/**
 * Safe defaults if the database is unreachable: public, already-shipped features stay on;
 * dark-launched ones stay off. A DB blip must never take down the public visualizer.
 */
const DEFAULTS: Record<string, boolean> = {
  'viz.public': true,
  'viz.practice-mode': true,
  'roles.frontend': true,
  'dashboard.plan': false,
};

export async function getFlags(subject: string | null): Promise<Record<string, boolean>> {
  if (!isDatabaseConfigured()) return DEFAULTS;
  try {
    return { ...DEFAULTS, ...(await getFlagsFor(subject)) };
  } catch (err) {
    console.error('[flags] falling back to defaults:', (err as Error).message);
    return DEFAULTS;
  }
}

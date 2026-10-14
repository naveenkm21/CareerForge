export type FlagRow = {
  key: string;
  enabled: boolean;
  rolloutPct: number;
  allowlist: string[];
};

/**
 * FNV-1a 32-bit. Deterministic bucketing so a user stays in (or out of) a rollout across
 * requests without storing anything.
 */
export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Bucket in [0, 100). */
export function rolloutBucket(flagKey: string, subject: string): number {
  return fnv1a(`${flagKey}:${subject}`) % 100;
}

/**
 * A flag is on for a subject when it is enabled AND (the subject is allow-listed OR the
 * subject's bucket falls under the rollout percentage). Unknown flags are off.
 */
export function isFlagOn(flag: FlagRow | undefined, subject: string | null): boolean {
  if (!flag || !flag.enabled) return false;
  if (subject && flag.allowlist.includes(subject)) return true;
  if (flag.rolloutPct >= 100) return true;
  if (flag.rolloutPct <= 0 || !subject) return false;
  return rolloutBucket(flag.key, subject) < flag.rolloutPct;
}

export function evaluateFlags(flags: FlagRow[], subject: string | null): Record<string, boolean> {
  return Object.fromEntries(flags.map((f) => [f.key, isFlagOn(f, subject)]));
}

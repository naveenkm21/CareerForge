import { z } from 'zod';

/** 3–24 chars: lowercase letters, digits, `-` or `_`; must start and end alphanumeric. */
export const HANDLE_RE = /^[a-z0-9][a-z0-9_-]{1,22}[a-z0-9]$/;

/** HTML forms submit blank optional inputs as ''. Treat those as absent, not as values. */
const optionalField = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    schema.optional(),
  );

export const onboardingInput = z.object({
  name: z.string().trim().min(1, 'Tell us what to call you').max(80),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(HANDLE_RE, '3–24 characters: lowercase letters, digits, - or _'),
  roleSlug: z.string().min(1, 'Pick a target role'),
  dailyMinutes: z.coerce.number().int().min(15).max(480),
  timezone: z
    .string()
    .min(1)
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, 'Unknown timezone'),
  targetDate: optionalField(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date')),
  college: optionalField(z.string().trim().max(120)),
  gradYear: optionalField(z.coerce.number().int().min(1990).max(2040)),
});
export type OnboardingInput = z.infer<typeof onboardingInput>;

export const DAILY_MINUTE_OPTIONS = [30, 60, 90, 120, 180] as const;

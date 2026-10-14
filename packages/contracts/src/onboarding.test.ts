import { describe, expect, it } from 'vitest';
import { onboardingInput } from './onboarding';

const valid = {
  name: 'Ada',
  handle: 'Ada_L',
  roleSlug: 'sde',
  dailyMinutes: '60',
  timezone: 'Asia/Kolkata',
  targetDate: '',
  college: '',
  gradYear: '',
};

describe('onboardingInput', () => {
  it('normalizes form data: lowercases handle, coerces numbers, blanks become undefined', () => {
    const r = onboardingInput.parse(valid);
    expect(r).toMatchObject({ handle: 'ada_l', dailyMinutes: 60 });
    expect(r.targetDate).toBeUndefined();
    expect(r.college).toBeUndefined();
    expect(r.gradYear).toBeUndefined();
  });

  it('rejects unknown timezones, bad handles and out-of-range budgets', () => {
    const bad = onboardingInput.safeParse({
      ...valid,
      timezone: 'Mars/Olympus',
      handle: 'a',
      dailyMinutes: '5',
    });
    expect(bad.success).toBe(false);
    const paths = bad.success ? [] : bad.error.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(['timezone', 'handle', 'dailyMinutes']));
  });

  it('accepts optional fields when present', () => {
    const r = onboardingInput.parse({
      ...valid,
      targetDate: '2027-03-01',
      gradYear: '2027',
      college: 'IIT',
    });
    expect(r).toMatchObject({ targetDate: '2027-03-01', gradYear: 2027, college: 'IIT' });
  });
});

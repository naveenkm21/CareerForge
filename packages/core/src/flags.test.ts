import { describe, expect, it } from 'vitest';
import { isFlagOn, rolloutBucket } from './flags';
import { greetingFor } from './greeting';

const flag = (over: Partial<Parameters<typeof isFlagOn>[0] & object> = {}) => ({
  key: 'viz.practice',
  enabled: true,
  rolloutPct: 100,
  allowlist: [],
  ...over,
});

describe('isFlagOn', () => {
  it('unknown and disabled flags are off', () => {
    expect(isFlagOn(undefined, 'u1')).toBe(false);
    expect(isFlagOn(flag({ enabled: false }), 'u1')).toBe(false);
  });

  it('allowlist beats rollout', () => {
    expect(isFlagOn(flag({ rolloutPct: 0, allowlist: ['u1'] }), 'u1')).toBe(true);
  });

  it('partial rollout is deterministic and roughly proportional', () => {
    const f = flag({ rolloutPct: 30 });
    const subjects = Array.from({ length: 2000 }, (_, i) => `user-${i}`);
    const on = subjects.filter((s) => isFlagOn(f, s)).length;
    expect(on / subjects.length).toBeGreaterThan(0.25);
    expect(on / subjects.length).toBeLessThan(0.35);
    expect(subjects.map((s) => isFlagOn(f, s))).toEqual(subjects.map((s) => isFlagOn(f, s)));
  });

  it('anonymous subjects only see fully rolled-out flags', () => {
    expect(isFlagOn(flag({ rolloutPct: 50 }), null)).toBe(false);
    expect(isFlagOn(flag({ rolloutPct: 100 }), null)).toBe(true);
  });

  it('buckets are in range', () => {
    for (let i = 0; i < 200; i++) {
      const b = rolloutBucket('k', `s${i}`);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(100);
    }
  });
});

describe('greetingFor', () => {
  it('uses the user timezone, not the server one', () => {
    const now = new Date('2026-09-29T03:30:00Z');
    expect(greetingFor(now, 'Asia/Kolkata')).toBe('Good morning'); // 09:00 IST
    expect(greetingFor(now, 'America/Los_Angeles')).toBe('Good evening'); // 20:30 PDT
  });
});

import { computeRemainingSeconds } from './countdown.util';

describe('computeRemainingSeconds', () => {
  it('falls back to the seed value when no deadline is configured', () => {
    expect(computeRemainingSeconds(null, 120)).toBe(120);
    expect(computeRemainingSeconds(undefined, 45)).toBe(45);
  });

  it('falls back to the seed value when the deadline is unparseable', () => {
    expect(computeRemainingSeconds('not-a-date', 90)).toBe(90);
  });

  it('computes the real remaining seconds from a future UTC deadline', () => {
    const deadline = new Date(Date.now() + 60_000).toISOString();
    const remaining = computeRemainingSeconds(deadline, 999);
    expect(remaining).toBeGreaterThan(55);
    expect(remaining).toBeLessThanOrEqual(60);
  });

  it('clamps to zero once the deadline has passed', () => {
    const deadline = new Date(Date.now() - 60_000).toISOString();
    expect(computeRemainingSeconds(deadline, 999)).toBe(0);
  });
});

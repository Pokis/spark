import { COMPLETION_GUARD_MS, tryAcquireCompletion } from './completionGuard';

describe('completion tap guard', () => {
  it('accepts one tap and ignores rapid duplicates for the same action', () => {
    const locks = new Map<string, number>();
    expect(tryAcquireCompletion(locks, 'habit:tiny', 10_000)).toBe(true);
    expect(tryAcquireCompletion(locks, 'habit:tiny', 10_100)).toBe(false);
    expect(
      tryAcquireCompletion(locks, 'habit:tiny', 10_000 + COMPLETION_GUARD_MS)
    ).toBe(true);
  });

  it('does not block a different habit action', () => {
    const locks = new Map<string, number>();
    expect(tryAcquireCompletion(locks, 'habit-a:tiny', 10_000)).toBe(true);
    expect(tryAcquireCompletion(locks, 'habit-b:tiny', 10_001)).toBe(true);
  });
});

export const COMPLETION_GUARD_MS = 1_500;

export function tryAcquireCompletion(
  locks: Map<string, number>,
  key: string,
  now = Date.now()
): boolean {
  const lockedAt = locks.get(key);
  if (lockedAt !== undefined && now - lockedAt < COMPLETION_GUARD_MS) return false;
  locks.set(key, now);
  return true;
}

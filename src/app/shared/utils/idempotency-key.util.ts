const STORAGE_PREFIX = 'hambox.idempotency.';

/**
 * Returns the idempotency key for an in-flight attempt under `scope` (e.g. 'checkout'),
 * generating and persisting a fresh one if none exists yet. Reusing the same key across
 * retries/double-clicks/refreshes within the same attempt is what makes the header useful —
 * call {@link clearIdempotencyKey} once the attempt completes successfully.
 */
export function getOrCreateIdempotencyKey(scope: string): string {
  const storageKey = STORAGE_PREFIX + scope;
  const existing = sessionStorage.getItem(storageKey);
  if (existing) {
    return existing;
  }

  const key = crypto.randomUUID();
  sessionStorage.setItem(storageKey, key);
  return key;
}

/** Clears the stored idempotency key for `scope`, so the next attempt starts fresh. */
export function clearIdempotencyKey(scope: string): void {
  sessionStorage.removeItem(STORAGE_PREFIX + scope);
}

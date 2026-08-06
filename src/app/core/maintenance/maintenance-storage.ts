/**
 * Storage access for maintenance/bypass state.
 *
 * `localStorage` is not merely absent in some contexts — in Safari private browsing, under
 * Firefox strict tracking protection, in sandboxed iframes and when storage is disabled by
 * policy, the property access itself or `getItem`/`setItem` throws instead of returning null.
 * Maintenance state is read and written on the app's critical boot path, so a throw there took
 * down the surrounding flow (an unpersisted bypass was reported back as a wrong password, and a
 * failed write aborted the redirect to /coming-soon). These wrappers degrade to in-memory-only
 * state for the session instead.
 */

export function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable — the in-memory signals still carry the state for this session.
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // As above.
  }
}

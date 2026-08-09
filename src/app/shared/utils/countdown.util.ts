/** Computes seconds remaining until a real backend deadline, falling back to a static seed
 * value when no deadline is configured. Used by countdown banners so a page refresh reflects
 * the true remaining time instead of restarting a client-only timer. */
export function computeRemainingSeconds(
  endsAtUtc: string | null | undefined,
  fallbackSeconds: number,
): number {
  if (!endsAtUtc) {
    return fallbackSeconds;
  }

  const deadline = Date.parse(endsAtUtc);
  if (Number.isNaN(deadline)) {
    return fallbackSeconds;
  }

  return Math.max(0, Math.round((deadline - Date.now()) / 1000));
}

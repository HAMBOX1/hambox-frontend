/**
 * Shift-click range selection: given the currently rendered row order, the last row the user
 * clicked (anchor), and the row they just shift-clicked (target), returns every id in between
 * (inclusive) — the GitHub/Gmail-style "click, then shift-click" range recipe.
 */
export function computeRangeIds(
  orderedIds: readonly string[],
  anchorId: string,
  targetId: string,
): readonly string[] {
  const anchorIndex = orderedIds.indexOf(anchorId);
  const targetIndex = orderedIds.indexOf(targetId);

  if (anchorIndex === -1 || targetIndex === -1) {
    return [targetId];
  }

  const [start, end] = anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
  return orderedIds.slice(start, end + 1);
}

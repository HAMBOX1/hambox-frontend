import { CollectionReorderEntry, CollectionTreeItem, CollectionTreeNode } from '../models/collection.model';

export function buildTree(items: readonly CollectionTreeItem[]): readonly CollectionTreeNode[] {
  const byParent = new Map<string | null, CollectionTreeItem[]>();

  for (const item of items) {
    const siblings = byParent.get(item.parentId) ?? [];
    siblings.push(item);
    byParent.set(item.parentId, siblings);
  }

  const toNode = (item: CollectionTreeItem): CollectionTreeNode => ({
    ...item,
    children: (byParent.get(item.id) ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(toNode),
  });

  return (byParent.get(null) ?? []).sort((a, b) => a.sortOrder - b.sortOrder).map(toNode);
}

export function findAncestorIds(
  id: string,
  parentMap: ReadonlyMap<string, CollectionTreeItem>,
): ReadonlySet<string> {
  const ancestors = new Set<string>();
  let cursor = parentMap.get(id)?.parentId ?? null;

  while (cursor) {
    ancestors.add(cursor);
    cursor = parentMap.get(cursor)?.parentId ?? null;
  }

  return ancestors;
}

export function isDescendantOf(
  candidateId: string,
  ancestorId: string,
  parentMap: ReadonlyMap<string, CollectionTreeItem>,
): boolean {
  let cursor = parentMap.get(candidateId)?.parentId ?? null;

  while (cursor) {
    if (cursor === ancestorId) {
      return true;
    }
    cursor = parentMap.get(cursor)?.parentId ?? null;
  }

  return false;
}

export type DropZone = 'before' | 'after' | 'inside';

/**
 * Builds the full set of reorder entries for one drag-and-drop move: the moved
 * node's new parent/position, plus a re-sequenced sort order for every sibling
 * in both the source and destination parent groups (so no gaps are left behind).
 * Mirrors `category-tree.utils.ts`'s `computeReorderEntries`.
 */
export function computeReorderEntries(
  items: readonly CollectionTreeItem[],
  movedId: string,
  targetId: string,
  zone: DropZone,
): CollectionReorderEntry[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const moved = byId.get(movedId);
  const target = byId.get(targetId);

  if (!moved || !target) {
    return [];
  }

  const oldParentId = moved.parentId;
  const newParentId = zone === 'inside' ? target.id : target.parentId;

  const siblingsOf = (parentId: string | null): CollectionTreeItem[] =>
    items
      .filter((item) => item.parentId === parentId && item.id !== movedId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  const destination = siblingsOf(newParentId);

  let insertAt = destination.length;
  if (zone !== 'inside') {
    const targetIndex = destination.findIndex((item) => item.id === targetId);
    insertAt = zone === 'before' ? targetIndex : targetIndex + 1;
  }

  destination.splice(insertAt, 0, moved);

  const entries: CollectionReorderEntry[] = destination.map((item, index) => ({
    id: item.id,
    parentId: item.id === movedId ? newParentId : item.parentId,
    sortOrder: index,
  }));

  if (oldParentId !== newParentId) {
    siblingsOf(oldParentId).forEach((item, index) => {
      entries.push({ id: item.id, parentId: item.parentId, sortOrder: index });
    });
  }

  return entries;
}

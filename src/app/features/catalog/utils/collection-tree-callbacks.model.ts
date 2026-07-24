import { CollectionTreeNode } from '../models/collection.model';
import { DropZone } from './collection-tree.utils';

export type { DropZone };

/** Bound once by `CollectionTreeComponent` so the same reference is reused across every
 * recursive `app-collection-tree-node` row (keeps OnPush cheap), mirroring
 * `CategoryTreeCallbacks`. */
export interface CollectionTreeCallbacks {
  isExpanded(id: string): boolean;
  toggleExpand(id: string): void;
  isMatched(id: string): boolean;
  searchTerm(): string;
  isMobile(): boolean;
  isDragged(id: string): boolean;
  dropZoneFor(id: string): DropZone | null;
  editCollection(node: CollectionTreeNode): void;
  deleteCollection(node: CollectionTreeNode): void;
  addChild(parentId: string): void;
  viewProducts(node: CollectionTreeNode): void;
  onRowDragMoved(id: string, pointerPosition: { x: number; y: number }): void;
  onRowDragEnded(id: string, pointerPosition: { x: number; y: number }): void;
}

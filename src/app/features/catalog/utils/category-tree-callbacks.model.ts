import { CategoryTreeNode } from '../models/category.model';
import { DropZone } from './category-tree.utils';

export type { DropZone };

/** Bound once by `CategoryTreeComponent` so the same reference is reused across every
 * recursive `app-category-tree-node` row (keeps OnPush cheap), mirroring the
 * `VariantTreeCallbacks` pattern used by the product variant tree. */
export interface CategoryTreeCallbacks {
  isExpanded(id: string): boolean;
  toggleExpand(id: string): void;
  isMatched(id: string): boolean;
  searchTerm(): string;
  isMobile(): boolean;
  isDragged(id: string): boolean;
  dropZoneFor(id: string): DropZone | null;
  editCategory(node: CategoryTreeNode): void;
  deleteCategory(node: CategoryTreeNode): void;
  manageMarketingPage(node: CategoryTreeNode): void;
  addChild(parentId: string): void;
  onRowDragMoved(id: string, pointerPosition: { x: number; y: number }): void;
  onRowDragEnded(id: string, pointerPosition: { x: number; y: number }): void;
}

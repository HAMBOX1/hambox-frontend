import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';

import { MobileViewportService } from '../../../../shared/services/mobile-viewport.service';
import {
  AdminEmptyStateComponent,
  AdminLoadingSkeletonComponent,
} from '../../../../shared/components/admin';
import { CollectionTreeNode } from '../../models/collection.model';
import { CollectionListFacade } from '../../services/collection-list.facade';
import { CollectionTreeCallbacks, DropZone } from '../../utils/collection-tree-callbacks.model';
import { computeReorderEntries, isDescendantOf } from '../../utils/collection-tree.utils';
import { CollectionTreeNodeComponent } from '../collection-tree-node/collection-tree-node.component';

interface DropTarget {
  readonly targetId: string;
  readonly zone: DropZone;
}

/** Mirrors `CategoryTreeComponent` — same recursive drag-and-drop tree shell, over
 * `CollectionListFacade` instead of `CategoryListFacade`. */
@Component({
  selector: 'app-collection-tree',
  standalone: true,
  imports: [CollectionTreeNodeComponent, AdminEmptyStateComponent, AdminLoadingSkeletonComponent],
  templateUrl: './collection-tree.component.html',
  styleUrl: './collection-tree.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionTreeComponent {
  private readonly facade = inject(CollectionListFacade);
  private readonly mobileViewport = inject(MobileViewportService);

  readonly createCollection = output<void>();
  readonly editCollection = output<CollectionTreeNode>();
  readonly deleteCollection = output<CollectionTreeNode>();
  readonly addChildCollection = output<string>();
  readonly viewProducts = output<CollectionTreeNode>();

  protected readonly tree = this.facade.tree;
  protected readonly loading = this.facade.loading;
  protected readonly isEmpty = this.facade.isEmpty;
  protected readonly hasActiveSearch = this.facade.hasActiveSearch;

  private readonly draggingIdState = signal<string | null>(null);
  private readonly dropTargetState = signal<DropTarget | null>(null);

  private readonly parentMap = computed(
    () => new Map(this.facade.flatItems().map((item) => [item.id, item])),
  );

  protected readonly callbacks: CollectionTreeCallbacks = {
    isExpanded: (id) => this.facade.effectiveExpandedIds().has(id),
    toggleExpand: (id) => this.facade.toggleExpand(id),
    isMatched: (id) => this.facade.matchedIds().has(id),
    searchTerm: () => this.facade.searchTerm(),
    isMobile: () => this.mobileViewport.isMobile(),
    isDragged: (id) => this.draggingIdState() === id,
    dropZoneFor: (id) => {
      const target = this.dropTargetState();
      return target?.targetId === id ? target.zone : null;
    },
    editCollection: (node) => this.editCollection.emit(node),
    deleteCollection: (node) => this.deleteCollection.emit(node),
    addChild: (parentId) => this.addChildCollection.emit(parentId),
    viewProducts: (node) => this.viewProducts.emit(node),
    onRowDragMoved: (id, pointerPosition) => this.onRowDragMoved(id, pointerPosition),
    onRowDragEnded: (id, pointerPosition) => void this.onRowDragEnded(id, pointerPosition),
  };

  protected onCreateRequested(): void {
    this.createCollection.emit();
  }

  private onRowDragMoved(id: string, pointerPosition: { x: number; y: number }): void {
    this.draggingIdState.set(id);
    this.dropTargetState.set(this.resolveDropTarget(id, pointerPosition));
  }

  private async onRowDragEnded(id: string, pointerPosition: { x: number; y: number }): Promise<void> {
    const target = this.resolveDropTarget(id, pointerPosition);
    this.draggingIdState.set(null);
    this.dropTargetState.set(null);

    if (!target) {
      return;
    }

    const entries = computeReorderEntries(this.facade.flatItems(), id, target.targetId, target.zone);
    if (entries.length === 0) {
      return;
    }

    await this.facade.reorderCollections(entries);
  }

  private resolveDropTarget(
    draggedId: string,
    pointerPosition: { x: number; y: number },
  ): DropTarget | null {
    const elements = document.elementsFromPoint(pointerPosition.x, pointerPosition.y);
    let rowElement: HTMLElement | null = null;
    let targetId: string | undefined;

    for (const candidate of elements) {
      const candidateRow = candidate.closest<HTMLElement>('[data-collection-row-id]');
      const candidateId = candidateRow?.dataset['collectionRowId'];
      if (candidateRow && candidateId && candidateId !== draggedId) {
        rowElement = candidateRow;
        targetId = candidateId;
        break;
      }
    }

    if (!rowElement || !targetId) {
      return null;
    }

    if (isDescendantOf(targetId, draggedId, this.parentMap())) {
      return null;
    }

    const rect = rowElement.getBoundingClientRect();
    const relativeY = (pointerPosition.y - rect.top) / rect.height;
    const zone: DropZone = relativeY < 0.25 ? 'before' : relativeY > 0.75 ? 'after' : 'inside';

    return { targetId, zone };
  }
}

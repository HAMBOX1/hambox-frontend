import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';

import { MobileViewportService } from '../../../../shared/services/mobile-viewport.service';
import {
  AdminEmptyStateComponent,
  AdminLoadingSkeletonComponent,
} from '../../../../shared/components/admin';
import { Category } from '../../models/category.model';
import { CategoryListFacade } from '../../services/category-list.facade';
import { CategoryTreeCallbacks, DropZone } from '../../utils/category-tree-callbacks.model';
import { computeReorderEntries, isDescendantOf } from '../../utils/category-tree.utils';
import { CategoryTreeNodeComponent } from '../category-tree-node/category-tree-node.component';

interface DropTarget {
  readonly targetId: string;
  readonly zone: DropZone;
}

@Component({
  selector: 'app-category-tree',
  standalone: true,
  imports: [CategoryTreeNodeComponent, AdminEmptyStateComponent, AdminLoadingSkeletonComponent],
  templateUrl: './category-tree.component.html',
  styleUrl: './category-tree.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryTreeComponent {
  private readonly facade = inject(CategoryListFacade);
  private readonly mobileViewport = inject(MobileViewportService);

  readonly createCategory = output<void>();
  readonly editCategory = output<Category>();
  readonly deleteCategory = output<Category>();
  readonly addChildCategory = output<string>();

  protected readonly tree = this.facade.tree;
  protected readonly loading = this.facade.loading;
  protected readonly isEmpty = this.facade.isEmpty;
  protected readonly hasActiveSearch = this.facade.hasActiveSearch;

  private readonly draggingIdState = signal<string | null>(null);
  private readonly dropTargetState = signal<DropTarget | null>(null);

  private readonly parentMap = computed(
    () => new Map(this.facade.flatItems().map((item) => [item.id, item])),
  );

  protected readonly callbacks: CategoryTreeCallbacks = {
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
    editCategory: (node) => this.editCategory.emit(node),
    deleteCategory: (node) => this.deleteCategory.emit(node),
    addChild: (parentId) => this.addChildCategory.emit(parentId),
    onRowDragMoved: (id, pointerPosition) => this.onRowDragMoved(id, pointerPosition),
    onRowDragEnded: (id, pointerPosition) => void this.onRowDragEnded(id, pointerPosition),
  };

  protected onCreateRequested(): void {
    this.createCategory.emit();
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

    await this.facade.reorderCategories(entries);
  }

  private resolveDropTarget(
    draggedId: string,
    pointerPosition: { x: number; y: number },
  ): DropTarget | null {
    // Without a cdkDropList, CDK free-drags the actual row element itself (via CSS
    // transform) rather than a separate preview clone — so elementFromPoint's
    // top hit is often the dragged row's own DOM. Walk the full z-order stack and
    // skip past it to find the row actually underneath the pointer.
    const elements = document.elementsFromPoint(pointerPosition.x, pointerPosition.y);
    let rowElement: HTMLElement | null = null;
    let targetId: string | undefined;

    for (const candidate of elements) {
      const candidateRow = candidate.closest<HTMLElement>('[data-category-row-id]');
      const candidateId = candidateRow?.dataset['categoryRowId'];
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

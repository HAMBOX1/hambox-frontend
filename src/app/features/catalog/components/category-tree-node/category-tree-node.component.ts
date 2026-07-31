import { DragDropModule, CdkDragMove, CdkDragEnd } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, input, viewChild } from '@angular/core';
import { MenuItem } from 'primeng/api';

import { AdminActionMenuComponent } from '../../../../shared/components/admin';
import { CategoryTreeNode } from '../../models/category.model';
import { CategoryTreeCallbacks } from '../../utils/category-tree-callbacks.model';
import { resolveProductImageUrl } from '../../utils/product-image.utils';

/** Recursive tree row: renders itself, then (once expanded) hands its children off to more
 * `app-category-tree-node` instances — mirrors the self-recursive pattern already used by
 * `app-variant-tree-node`. Never owns tree/drag state itself; everything comes through the
 * shared `callbacks` object bound once by the root `CategoryTreeComponent`. */
@Component({
  selector: 'app-category-tree-node',
  standalone: true,
  imports: [DragDropModule, AdminActionMenuComponent, CategoryTreeNodeComponent],
  templateUrl: './category-tree-node.component.html',
  styleUrl: './category-tree-node.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryTreeNodeComponent {
  readonly node = input.required<CategoryTreeNode>();
  readonly depth = input(0);
  readonly isLast = input(false);
  readonly callbacks = input.required<CategoryTreeCallbacks>();

  private readonly actionMenu = viewChild(AdminActionMenuComponent);

  protected readonly hasChildren = computed(() => this.node().children.length > 0);
  protected readonly isExpanded = computed(() => this.callbacks().isExpanded(this.node().id));
  protected readonly thumbnailUrl = computed(() => {
    const imageUrl = this.node().imageUrl;
    return imageUrl ? resolveProductImageUrl(imageUrl) || null : null;
  });

  protected readonly menuItems = computed<MenuItem[]>(() => {
    const node = this.node();
    const callbacks = this.callbacks();

    return [
      {
        label: 'Edit category',
        icon: 'pi pi-pencil',
        command: () => callbacks.editCategory(node),
      },
      {
        label: 'Duplicate category',
        icon: 'pi pi-copy',
        disabled: true,
        tooltip: 'Coming soon',
      },
      {
        // Parent reassignment already lives front-and-center in the edit form
        // (see CategoryCreateFormComponent) — "Move" just opens the same dialog
        // rather than a second, separate parent-picker UI.
        label: 'Move category',
        icon: 'pi pi-arrows-alt',
        command: () => callbacks.editCategory(node),
      },
      {
        label: 'Add child category',
        icon: 'pi pi-plus',
        command: () => callbacks.addChild(node.id),
      },
      { separator: true },
      {
        label: 'Delete category',
        icon: 'pi pi-trash',
        styleClass: 'category-tree-node__menu-item--danger',
        command: () => callbacks.deleteCategory(node),
      },
    ];
  });

  protected readonly nameSegments = computed(() => {
    const name = this.node().nameEn;
    const term = this.callbacks().searchTerm().trim().toLowerCase();

    if (!term || !this.callbacks().isMatched(this.node().id)) {
      return [{ text: name, matched: false }];
    }

    const index = name.toLowerCase().indexOf(term);
    if (index < 0) {
      return [{ text: name, matched: false }];
    }

    return [
      { text: name.slice(0, index), matched: false },
      { text: name.slice(index, index + term.length), matched: true },
      { text: name.slice(index + term.length), matched: false },
    ].filter((segment) => segment.text.length > 0);
  });

  protected toggle(): void {
    if (this.hasChildren()) {
      this.callbacks().toggleExpand(this.node().id);
    }
  }

  protected onRowActivate(event: Event): void {
    if (this.callbacks().isMobile()) {
      this.actionMenu()?.toggle(event);
    }
  }

  protected onDragMoved(event: CdkDragMove<string>): void {
    this.callbacks().onRowDragMoved(this.node().id, event.pointerPosition);
  }

  protected onDragEnded(event: CdkDragEnd<string>): void {
    this.callbacks().onRowDragEnded(this.node().id, event.dropPoint);
  }
}

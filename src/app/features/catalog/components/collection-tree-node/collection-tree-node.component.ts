import { DragDropModule, CdkDragMove, CdkDragEnd } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, input, viewChild } from '@angular/core';
import { MenuItem } from 'primeng/api';

import { AdminActionMenuComponent } from '../../../../shared/components/admin';
import { CollectionTreeNode } from '../../models/collection.model';
import { CollectionTreeCallbacks } from '../../utils/collection-tree-callbacks.model';
import { collectionColorVar } from '../../utils/collection-presets.util';

/** Recursive tree row for Collections — mirrors `app-category-tree-node` exactly, minus the
 * active/inactive concept (collections have no such state) and with an "System" badge instead. */
@Component({
  selector: 'app-collection-tree-node',
  standalone: true,
  imports: [DragDropModule, AdminActionMenuComponent, CollectionTreeNodeComponent],
  templateUrl: './collection-tree-node.component.html',
  styleUrl: './collection-tree-node.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionTreeNodeComponent {
  readonly node = input.required<CollectionTreeNode>();
  readonly depth = input(0);
  readonly isLast = input(false);
  readonly callbacks = input.required<CollectionTreeCallbacks>();

  private readonly actionMenu = viewChild(AdminActionMenuComponent);

  protected readonly hasChildren = computed(() => this.node().children.length > 0);
  protected readonly isExpanded = computed(() => this.callbacks().isExpanded(this.node().id));
  protected readonly iconColor = computed(() => collectionColorVar(this.node().color));

  protected readonly menuItems = computed<MenuItem[]>(() => {
    const node = this.node();
    const callbacks = this.callbacks();

    const items: MenuItem[] = [
      {
        label: 'View products',
        icon: 'pi pi-external-link',
        command: () => callbacks.viewProducts(node),
      },
      {
        label: 'Edit collection',
        icon: 'pi pi-pencil',
        command: () => callbacks.editCollection(node),
      },
      {
        label: 'Add child collection',
        icon: 'pi pi-plus',
        command: () => callbacks.addChild(node.id),
      },
    ];

    if (!node.isSystem) {
      items.push(
        { separator: true },
        {
          label: 'Delete collection',
          icon: 'pi pi-trash',
          styleClass: 'collection-tree-node__menu-item--danger',
          command: () => callbacks.deleteCollection(node),
        },
      );
    }

    return items;
  });

  protected readonly nameSegments = computed(() => {
    const name = this.node().name;
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

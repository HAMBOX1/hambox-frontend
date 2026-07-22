import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import {
  isLeafGroup as isLeafGroupNodes,
  VariantTreeCallbacks,
  VariantTreeNode,
} from '../../utils/variant-tree.utils';
import { ProductVariantLeafListComponent } from '../product-variant-leaf-list/product-variant-leaf-list.component';

/** Recursive branch row. Renders a chevron/label/count header, and — once expanded — either more
 * `app-variant-tree-node` branches, or, once its children are variant leaves, hands off to
 * `app-variant-leaf-list` for virtualized card rendering. Never renders leaf cards itself. */
@Component({
  selector: 'app-variant-tree-node',
  standalone: true,
  imports: [ProductVariantLeafListComponent, ProductVariantTreeNodeComponent],
  templateUrl: './product-variant-tree-node.component.html',
  styleUrl: './product-variant-tree-node.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductVariantTreeNodeComponent {
  readonly node = input.required<VariantTreeNode>();
  readonly depth = input(0);
  readonly callbacks = input.required<VariantTreeCallbacks>();

  protected readonly isLeafGroup = computed(() => isLeafGroupNodes(this.node().children));
}

import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';

import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { VariantTreeCallbacks, VariantTreeNode } from '../../utils/variant-tree.utils';

/**
 * Fixed row height fed to the CDK virtual scroll viewport — must match the variant row's
 * rendered height (see scss). Two-line row: name+status, then price+Available.
 */
const ITEM_SIZE_PX = 56;
/**
 * <=320px stacks the row into three lines (name / status / Available, see scss) instead of
 * shrinking everything onto two — CDK's fixed-size virtual scroll needs its numeric item size
 * to match that taller layout, which CSS alone can't tell it. Must stay in sync with the
 * `(max-width: 320px)` breakpoint used in the stylesheet.
 */
const STACKED_ITEM_SIZE_PX = 76;
const STACKED_LAYOUT_QUERY = '(max-width: 320px)';
/** Show at most this many rows' worth of height before scrolling, so a short list doesn't leave a mostly-empty viewport. */
const MAX_VISIBLE_ROWS = 8;

/** Renders a (potentially huge) list of variant leaves as a compact, single-click-to-open row (name, status, price/stock summary) inside a CDK virtual scroll viewport, so a product with hundreds of variants never renders more than a screenful of DOM at once. The hierarchy only groups these rows — it never replaces them. Used both at tree-root level (single-option-group products) and nested inside a branch node. */
@Component({
  selector: 'app-variant-leaf-list',
  standalone: true,
  imports: [FormsModule, CheckboxModule, TagModule, ScrollingModule, HamboxCurrencyPipe],
  templateUrl: './product-variant-leaf-list.component.html',
  styleUrl: './product-variant-leaf-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductVariantLeafListComponent {
  readonly children = input.required<readonly VariantTreeNode[]>();
  readonly callbacks = input.required<VariantTreeCallbacks>();
  readonly depth = input(0);

  private readonly stackedMediaQuery =
    typeof window !== 'undefined' ? window.matchMedia(STACKED_LAYOUT_QUERY) : null;
  /** Drives both the CSS-independent virtual-scroll item size and the row's stacked-layout class. */
  protected readonly stackedLayout = signal(this.stackedMediaQuery?.matches ?? false);

  protected readonly itemSize = computed(() => (this.stackedLayout() ? STACKED_ITEM_SIZE_PX : ITEM_SIZE_PX));

  private readonly viewport = viewChild(CdkVirtualScrollViewport);

  protected readonly viewportHeight = computed(() => {
    const size = this.itemSize();
    return Math.min(this.children().length, MAX_VISIBLE_ROWS) * size || size;
  });

  private readonly firstHighlightedIndex = computed(() =>
    this.children().findIndex((child) => child.variant && this.callbacks().isHighlighted(child.variant.id)),
  );

  constructor() {
    if (this.stackedMediaQuery) {
      const sync = (): void => this.stackedLayout.set(this.stackedMediaQuery!.matches);
      this.stackedMediaQuery.addEventListener('change', sync);
      inject(DestroyRef).onDestroy(() => this.stackedMediaQuery!.removeEventListener('change', sync));
    }

    effect(() => {
      const index = this.firstHighlightedIndex();
      const active = this.callbacks().searchActive();
      const viewport = this.viewport();
      if (active && index >= 0 && viewport) {
        viewport.scrollToIndex(index, 'smooth');
      }
    });
  }

  protected trackByKey(_index: number, node: VariantTreeNode): string {
    return node.key;
  }

  protected isShiftClick(event: Event | undefined): boolean {
    return event instanceof MouseEvent && event.shiftKey;
  }
}

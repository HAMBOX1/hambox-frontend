import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { ProductStatus, ProductStatusCounts } from '../../models/product.model';

const PENDING_MERGE_TAB = 'PendingMerge' as const;

interface StatusTab {
  readonly value: ProductStatus | '' | typeof PENDING_MERGE_TAB;
  readonly labelKey: string;
  readonly count: number | null;
}

/**
 * A faster alternative to the toolbar's status dropdown: four status tabs (All/Draft/Live/Archived
 * — the same four statuses that dropdown exposes minus "Inactive", which stays dropdown-only) plus
 * a fifth "Pending Merge" tab, orthogonal to status (see `ProductCatalogFacade.pendingMergeOnly`).
 * Purely a view over the facade's filter state — the page component still owns
 * `setStatusFilter`/`setPendingMergeOnly`, so clicking a tab behaves identically to picking it from
 * the dropdown.
 */
@Component({
  selector: 'app-product-catalog-status-tabs',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './product-catalog-status-tabs.component.html',
  styleUrl: './product-catalog-status-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCatalogStatusTabsComponent {
  // Plain `string` (not `ProductStatus | ''`) to match `ProductCatalogFacade.statusFilter`'s actual
  // signal type — mirrors `ProductCatalogToolbarComponent.statusFilter` for the same reason.
  readonly activeStatus = input('');
  readonly pendingMergeActive = input(false);
  readonly counts = input<ProductStatusCounts | null>(null);
  readonly statusChange = output<ProductStatus | ''>();
  readonly pendingMergeChange = output<void>();

  protected readonly tabs = computed<StatusTab[]>(() => {
    const counts = this.counts();
    return [
      { value: '', labelKey: 'ADMIN.CATALOG_PAGE.STATUS_TABS.ALL', count: counts?.all ?? null },
      { value: 'Draft', labelKey: 'ADMIN.CATALOG_PAGE.STATUS_TABS.DRAFT', count: counts?.draft ?? null },
      { value: 'Active', labelKey: 'ADMIN.CATALOG_PAGE.STATUS_TABS.LIVE', count: counts?.active ?? null },
      { value: 'Archived', labelKey: 'ADMIN.CATALOG_PAGE.STATUS_TABS.ARCHIVED', count: counts?.archived ?? null },
      {
        value: PENDING_MERGE_TAB,
        labelKey: 'ADMIN.CATALOG_PAGE.PENDING_MERGE.TAB_LABEL',
        count: counts?.pendingMerge ?? null,
      },
    ];
  });

  protected isActive(tab: StatusTab): boolean {
    return tab.value === PENDING_MERGE_TAB ? this.pendingMergeActive() : tab.value === this.activeStatus();
  }

  protected select(tab: StatusTab): void {
    if (tab.value === PENDING_MERGE_TAB) {
      if (!this.pendingMergeActive()) {
        this.pendingMergeChange.emit();
      }
      return;
    }

    if (tab.value !== this.activeStatus()) {
      this.statusChange.emit(tab.value);
    }
  }
}

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { ProductStatus, ProductStatusCounts } from '../../models/product.model';

interface StatusTab {
  readonly value: ProductStatus | '';
  readonly labelKey: string;
  readonly count: number | null;
}

/**
 * A faster alternative to the toolbar's status dropdown: four tabs (All/Draft/Live/Archived) — the
 * same four statuses that dropdown exposes minus "Inactive", which stays dropdown-only. Purely a
 * view over `ProductCatalogFacade.statusFilter`/`statusCounts` — the page component still owns
 * `setStatusFilter`, so clicking a tab behaves identically to picking it from the dropdown.
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
  readonly counts = input<ProductStatusCounts | null>(null);
  readonly statusChange = output<ProductStatus | ''>();

  protected readonly tabs = computed<StatusTab[]>(() => {
    const counts = this.counts();
    return [
      { value: '', labelKey: 'ADMIN.CATALOG_PAGE.STATUS_TABS.ALL', count: counts?.all ?? null },
      { value: 'Draft', labelKey: 'ADMIN.CATALOG_PAGE.STATUS_TABS.DRAFT', count: counts?.draft ?? null },
      { value: 'Active', labelKey: 'ADMIN.CATALOG_PAGE.STATUS_TABS.LIVE', count: counts?.active ?? null },
      { value: 'Archived', labelKey: 'ADMIN.CATALOG_PAGE.STATUS_TABS.ARCHIVED', count: counts?.archived ?? null },
    ];
  });

  protected select(value: ProductStatus | ''): void {
    if (value !== this.activeStatus()) {
      this.statusChange.emit(value);
    }
  }
}

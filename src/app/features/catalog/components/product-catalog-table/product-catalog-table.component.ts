import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import {
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
} from '../../../../shared/components/admin';
import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { copyToClipboard, formatShortGuid } from '../../../../shared/utils/guid-display.util';
import { Product, ProductStatus } from '../../models/product.model';
import { productStatusLabel } from '../../utils/product-display.utils';

@Component({
  selector: 'app-product-catalog-table',
  standalone: true,
  imports: [
    TableModule,
    SkeletonModule,
    ButtonModule,
    TooltipModule,
    HamboxCurrencyPipe,
    AdminDataTableShellComponent,
    AdminStatusBadgeComponent,
    AdminEmptyStateComponent,
  ],
  templateUrl: './product-catalog-table.component.html',
  styleUrl: './product-catalog-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCatalogTableComponent {
  readonly products = input.required<readonly Product[]>();
  readonly loading = input(false);
  readonly totalRecords = input(0);
  readonly pageSize = input(20);
  readonly first = input(0);
  readonly selectedProductId = input<string | null>(null);
  readonly searchActive = input(false);

  readonly createProduct = output<void>();

  readonly pageChange = output<TableLazyLoadEvent>();
  readonly productSelect = output<string>();

  protected readonly skeletonRows = Array.from({ length: 6 }, (_, index) => index);

  protected readonly tableSelection = computed(() => {
    const selectedId = this.selectedProductId();
    if (!selectedId) {
      return null;
    }

    return this.products().find((product) => product.id === selectedId) ?? null;
  });

  protected readonly statusLabel = productStatusLabel;
  protected readonly formatShortGuid = formatShortGuid;
  protected readonly copiedId = signal<string | null>(null);

  protected statusTone(status: ProductStatus): AdminStatusTone {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Draft':
        return 'warning';
      case 'Inactive':
        return 'danger';
      case 'Archived':
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.pageChange.emit(event);
  }

  protected onSelectionChange(product: Product | Product[] | null | undefined): void {
    if (!product || Array.isArray(product)) {
      return;
    }

    this.productSelect.emit(product.id);
  }

  protected async copyProductId(id: string, event: Event): Promise<void> {
    event.stopPropagation();
    const copied = await copyToClipboard(id);
    if (copied) {
      this.copiedId.set(id);
      window.setTimeout(() => {
        if (this.copiedId() === id) {
          this.copiedId.set(null);
        }
      }, 1500);
    }
  }
}

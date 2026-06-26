import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';

import { Product } from '../../models/product.model';
import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import {
  productStatusLabel,
  productStatusSeverity,
} from '../../utils/product-display.utils';

@Component({
  selector: 'app-product-catalog-table',
  standalone: true,
  imports: [TableModule, TagModule, SkeletonModule, HamboxCurrencyPipe],
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
  protected readonly statusSeverity = productStatusSeverity;

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.pageChange.emit(event);
  }

  protected onSelectionChange(product: Product | Product[] | null | undefined): void {
    if (!product || Array.isArray(product)) {
      return;
    }

    this.productSelect.emit(product.id);
  }
}

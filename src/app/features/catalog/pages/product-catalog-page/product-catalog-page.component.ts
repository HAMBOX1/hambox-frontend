import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableLazyLoadEvent } from 'primeng/table';

import { ProductCatalogToolbarComponent } from '../../components/product-catalog-toolbar/product-catalog-toolbar.component';
import { ProductCatalogTableComponent } from '../../components/product-catalog-table/product-catalog-table.component';
import { ProductDetailPanelComponent } from '../../components/product-detail-panel/product-detail-panel.component';
import { ProductStatus } from '../../models/product.model';
import { ProductCatalogFacade } from '../../services/product-catalog.facade';

@Component({
  selector: 'app-product-catalog-page',
  standalone: true,
  imports: [
    ButtonModule,
    ToastModule,
    ProductCatalogToolbarComponent,
    ProductCatalogTableComponent,
    ProductDetailPanelComponent,
  ],
  providers: [ProductCatalogFacade, MessageService],
  templateUrl: './product-catalog-page.component.html',
  styleUrl: './product-catalog-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCatalogPageComponent {
  private readonly facade = inject(ProductCatalogFacade);
  private readonly messageService = inject(MessageService);

  protected readonly items = this.facade.items;
  protected readonly loading = this.facade.loading;
  protected readonly searchTerm = this.facade.searchTerm;
  protected readonly error = this.facade.error;
  protected readonly totalCount = this.facade.totalCount;
  protected readonly pageSize = this.facade.pageSize;
  protected readonly selectedProduct = this.facade.selectedProduct;
  protected readonly selectedProductId = this.facade.selectedProductId;
  protected readonly hasActiveSearch = this.facade.hasActiveSearch;
  protected readonly subtitle = this.facade.subtitle;
  protected readonly updatingStatus = this.facade.updatingStatus;
  protected readonly statusError = this.facade.statusError;

  protected readonly tableFirst = computed(
    () => (this.facade.pageNumber() - 1) * this.facade.pageSize(),
  );

  protected onSearchChange(term: string): void {
    this.facade.setSearchTerm(term);
  }

  protected onPageChange(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.facade.pageSize();
    const first = event.first ?? 0;
    const pageNumber = Math.floor(first / rows) + 1;

    this.facade.setPage(pageNumber, rows);
  }

  protected onProductSelect(productId: string): void {
    this.facade.selectProduct(productId);
  }

  protected onClosePanel(): void {
    this.facade.clearSelection();
  }

  protected async onStatusChange(status: ProductStatus): Promise<void> {
    const product = this.selectedProduct();

    if (!product) {
      return;
    }

    const success = await this.facade.updateProductStatus(product, status);

    if (success) {
      const detail =
        status === 'Active'
          ? `"${product.nameEn}" is now visible on the storefront.`
          : `"${product.nameEn}" was hidden from the storefront.`;

      this.messageService.add({
        severity: 'success',
        summary: status === 'Active' ? 'Published' : 'Hidden',
        detail,
        life: 4000,
      });
    }
  }

  protected retryLoad(): void {
    void this.facade.reload();
  }
}

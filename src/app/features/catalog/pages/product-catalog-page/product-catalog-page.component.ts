import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TableLazyLoadEvent } from 'primeng/table';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import { ProductCatalogToolbarComponent } from '../../components/product-catalog-toolbar/product-catalog-toolbar.component';
import { ProductCatalogTableComponent } from '../../components/product-catalog-table/product-catalog-table.component';
import { ProductDetailPanelComponent } from '../../components/product-detail-panel/product-detail-panel.component';
import { ProductStatus } from '../../models/product.model';
import { ProductCatalogFacade } from '../../services/product-catalog.facade';
import {
  AdminConfirmDialogComponent,
  AdminErrorAlertComponent,
  AdminPageHeaderComponent,
  AdminStatCardComponent,
  AdminStatGridComponent,
} from '../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';

@Component({
  selector: 'app-product-catalog-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    DialogModule,
    DrawerModule,
    InputTextModule,
    ToastModule,
    HasPermissionDirective,
    ProductCatalogToolbarComponent,
    ProductCatalogTableComponent,
    ProductDetailPanelComponent,
    AdminPageHeaderComponent,
    AdminStatGridComponent,
    AdminStatCardComponent,
    AdminErrorAlertComponent,
    AdminConfirmDialogComponent,
    TranslatePipe,
  ],
  providers: [ProductCatalogFacade, MessageService],
  templateUrl: './product-catalog-page.component.html',
  styleUrl: './product-catalog-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCatalogPageComponent implements OnInit {
  private readonly facade = inject(ProductCatalogFacade);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'ADMIN.CATALOG_PAGE.TITLE' });

  protected readonly items = this.facade.items;
  protected readonly loading = this.facade.loading;
  protected readonly searchTerm = this.facade.searchTerm;
  protected readonly statusFilter = this.facade.statusFilter;
  protected readonly error = this.facade.error;
  protected readonly totalCount = this.facade.totalCount;
  protected readonly pageSize = this.facade.pageSize;
  protected readonly selectedProduct = this.facade.selectedProduct;
  protected readonly selectedProductId = this.facade.selectedProductId;
  protected readonly hasActiveSearch = this.facade.hasActiveSearch;
  protected readonly hasActiveFilters = this.facade.hasActiveFilters;
  protected readonly subtitle = this.facade.subtitle;
  protected readonly updatingStatus = this.facade.updatingStatus;
  protected readonly actionLoading = this.facade.actionLoading;
  protected readonly statusError = this.facade.statusError;

  protected readonly deleteDialogOpen = signal(false);
  protected readonly duplicateDialogOpen = signal(false);
  protected readonly duplicateNameSuffix = signal(' Copy');

  protected readonly tableFirst = computed(
    () => (this.facade.pageNumber() - 1) * this.facade.pageSize(),
  );

  protected readonly listStats = computed(() => {
    const items = this.items();

    return {
      total: this.totalCount(),
      active: items.filter((product) => product.status === 'Active').length,
      draft: items.filter((product) => product.status === 'Draft').length,
      needsAttention: items.filter(
        (product) => product.status === 'Draft' || product.status === 'Inactive',
      ).length,
    };
  });

  protected readonly drawerVisible = computed(() => this.selectedProductId() !== null);

  ngOnInit(): void {
    void this.facade.reload();
  }

  protected onSearchChange(term: string): void {
    this.facade.setSearchTerm(term);
  }

  protected onStatusFilterChange(status: ProductStatus | ''): void {
    this.facade.setStatusFilter(status);
  }

  protected onClearFilters(): void {
    this.facade.clearFilters();
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

  protected onDrawerVisibleChange(visible: boolean): void {
    if (!visible) {
      this.onClosePanel();
    }
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
          ? this.translate.instant('ADMIN.CATALOG_PAGE.TOAST.PUBLISHED_DETAIL', { name: product.nameEn })
          : this.translate.instant('ADMIN.CATALOG_PAGE.TOAST.UPDATED_DETAIL', { name: product.nameEn });

      this.messageService.add({
        severity: 'success',
        summary: status === 'Active'
          ? this.translate.instant('ADMIN.CATALOG_PAGE.TOAST.PUBLISHED_TITLE')
          : this.translate.instant('ADMIN.CATALOG_PAGE.TOAST.UPDATED_TITLE'),
        detail,
        life: 4000,
      });
    }
  }

  protected openDuplicateDialog(): void {
    this.duplicateNameSuffix.set(this.translate.instant('ADMIN.CATALOG_PAGE.DUPLICATE.DEFAULT_SUFFIX'));
    this.duplicateDialogOpen.set(true);
  }

  protected async confirmDuplicate(): Promise<void> {
    const product = this.selectedProduct();
    if (!product) {
      return;
    }

    const newId = await this.facade.duplicateProduct(product.id, this.duplicateNameSuffix().trim() || null);
    if (newId) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.CATALOG_PAGE.TOAST.DUPLICATED_TITLE'),
        detail: this.translate.instant('ADMIN.CATALOG_PAGE.TOAST.DUPLICATED_DETAIL'),
        life: 4000,
      });
      this.duplicateDialogOpen.set(false);
      void this.router.navigate(['/admin/products', newId, 'edit']);
    }
  }

  protected requestDelete(): void {
    if (this.selectedProduct()) {
      this.deleteDialogOpen.set(true);
    }
  }

  protected async confirmDelete(): Promise<void> {
    const product = this.selectedProduct();
    if (!product) {
      return;
    }

    const success = await this.facade.deleteProduct(product.id);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.CATALOG_PAGE.TOAST.DELETED_TITLE'),
        detail: this.translate.instant('ADMIN.CATALOG_PAGE.TOAST.DELETED_DETAIL', { name: product.nameEn }),
        life: 4000,
      });
      this.deleteDialogOpen.set(false);
    }
  }

  protected deleteDialogMessage(): string {
    const product = this.selectedProduct();
    return product
      ? this.translate.instant('ADMIN.CATALOG_PAGE.DELETE.MESSAGE', { name: product.nameEn })
      : '';
  }

  protected retryLoad(): void {
    void this.facade.reload();
  }

  protected navigateToCreate(): void {
    void this.router.navigate(['/admin/products/new']);
  }
}

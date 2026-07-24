import { ChangeDetectionStrategy, Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TableLazyLoadEvent } from 'primeng/table';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import { PermissionService } from '../../../../core/permissions/permission.service';
import { ProductCatalogToolbarComponent } from '../../components/product-catalog-toolbar/product-catalog-toolbar.component';
import {
  ProductCatalogTableComponent,
  ProductFieldEdit,
  ProductStatusEdit,
} from '../../components/product-catalog-table/product-catalog-table.component';
import { ProductCatalogCardsComponent } from '../../components/product-catalog-cards/product-catalog-cards.component';
import { ProductDetailPanelComponent } from '../../components/product-detail-panel/product-detail-panel.component';
import { PriceAdjustmentMode, Product, ProductSortBy, ProductStatus } from '../../models/product.model';
import {
  AdminProductsViewMode,
  AdminProductsViewModeService,
} from '../../services/admin-products-view-mode.service';
import { ProductCatalogFacade } from '../../services/product-catalog.facade';
import {
  AdminActionMenuComponent,
  AdminBulkBarComponent,
  AdminConfirmDialogComponent,
  AdminErrorAlertComponent,
  AdminIconButtonComponent,
  AdminPageHeaderComponent,
} from '../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { computeRangeIds } from '../../../../shared/utils/selection.utils';

const SORT_FIELD_TO_ENUM: Record<string, { asc: ProductSortBy; desc: ProductSortBy }> = {
  nameEn: { asc: 'NameAsc', desc: 'NameDesc' },
  categoryName: { asc: 'CategoryAsc', desc: 'CategoryDesc' },
  price: { asc: 'PriceAsc', desc: 'PriceDesc' },
  status: { asc: 'StatusAsc', desc: 'StatusDesc' },
  availableStock: { asc: 'StockAsc', desc: 'StockDesc' },
};

const SORT_ENUM_TO_FIELD: Partial<Record<ProductSortBy, { field: string; order: number }>> = {
  PriceAsc: { field: 'price', order: 1 },
  PriceDesc: { field: 'price', order: -1 },
  NameAsc: { field: 'nameEn', order: 1 },
  NameDesc: { field: 'nameEn', order: -1 },
  CategoryAsc: { field: 'categoryName', order: 1 },
  CategoryDesc: { field: 'categoryName', order: -1 },
  StatusAsc: { field: 'status', order: 1 },
  StatusDesc: { field: 'status', order: -1 },
  StockAsc: { field: 'availableStock', order: 1 },
  StockDesc: { field: 'availableStock', order: -1 },
};

@Component({
  selector: 'app-product-catalog-page',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    DialogModule,
    DrawerModule,
    InputNumberModule,
    InputTextModule,
    RadioButtonModule,
    SelectModule,
    ToastModule,
    HasPermissionDirective,
    ProductCatalogToolbarComponent,
    ProductCatalogTableComponent,
    ProductCatalogCardsComponent,
    ProductDetailPanelComponent,
    AdminActionMenuComponent,
    AdminBulkBarComponent,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminConfirmDialogComponent,
    AdminIconButtonComponent,
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
  private readonly route = inject(ActivatedRoute);
  private readonly viewModeService = inject(AdminProductsViewModeService);
  private readonly permissionService = inject(PermissionService);

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
  protected readonly updatingStatus = this.facade.updatingStatus;
  protected readonly actionLoading = this.facade.actionLoading;
  protected readonly statusError = this.facade.statusError;

  protected readonly categoryOptions = this.facade.categoryOptions;
  protected readonly collectionOptions = this.facade.collectionOptions;
  protected readonly collectionFilter = this.facade.collectionFilter;
  protected readonly viewMode = this.viewModeService.mode;

  protected readonly deleteDialogOpen = signal(false);
  protected readonly duplicateDialogOpen = signal(false);
  protected readonly duplicateNameSuffix = signal(' Copy');
  protected readonly actionTarget = signal<Product | null>(null);

  // Bulk selection (product list)
  protected readonly bulkSelectedIds = this.facade.bulkSelectedIds;
  protected readonly bulkSelectedCount = this.facade.bulkSelectedCount;
  protected readonly isAllPageSelected = this.facade.isAllPageSelected;
  protected readonly canOfferSelectAllMatching = this.facade.canOfferSelectAllMatching;
  protected readonly selectAllMatchingActive = this.facade.selectAllMatchingActive;
  protected readonly bulkActionLoading = this.facade.bulkActionLoading;
  private readonly bulkAnchorId = signal<string | null>(null);

  protected readonly bulkDeleteDialogOpen = signal(false);
  protected readonly bulkDuplicateDialogOpen = signal(false);
  protected readonly bulkCategoryDialogOpen = signal(false);
  protected readonly bulkPriceDialogOpen = signal(false);
  protected readonly bulkAssignCollectionDialogOpen = signal(false);
  protected readonly bulkRemoveCollectionDialogOpen = signal(false);
  protected readonly bulkCreateCollectionDialogOpen = signal(false);
  protected readonly bulkDuplicateSuffix = signal(' Copy');
  protected readonly bulkTargetCategoryId = signal<string | null>(null);
  protected readonly bulkPriceMode = signal<PriceAdjustmentMode>('IncreasePercent');
  protected readonly bulkPriceValue = signal<number | null>(null);
  protected readonly bulkTargetCollectionId = signal<string | null>(null);
  protected readonly bulkNewCollectionName = signal('');

  protected readonly bulkMoreMenuItems = computed<MenuItem[]>(() => {
    const t = (key: string) => this.translate.instant(key);
    const items: MenuItem[] = [];
    if (this.permissionService.hasPermission(this.permissions.Catalog.Products.Create)) {
      items.push({
        label: t('ADMIN.CATALOG_PAGE.ACTIONS.DUPLICATE'),
        icon: 'pi pi-copy',
        command: () => this.bulkDuplicateDialogOpen.set(true),
      });
    }
    if (this.permissionService.hasPermission(this.permissions.Catalog.Products.Edit)) {
      items.push({
        label: t('ADMIN.CATALOG_PAGE.BULK.CHANGE_CATEGORY'),
        icon: 'pi pi-tag',
        command: () => this.bulkCategoryDialogOpen.set(true),
      });
      items.push({
        label: t('ADMIN.CATALOG_PAGE.BULK.ADJUST_PRICE'),
        icon: 'pi pi-dollar',
        command: () => this.bulkPriceDialogOpen.set(true),
      });
    }
    if (this.permissionService.hasPermission(this.permissions.Catalog.Collections.Edit)) {
      items.push({
        label: t('ADMIN.CATALOG_PAGE.BULK.ASSIGN_COLLECTION'),
        icon: 'pi pi-folder',
        command: () => this.bulkAssignCollectionDialogOpen.set(true),
      });
      items.push({
        label: t('ADMIN.CATALOG_PAGE.BULK.REMOVE_COLLECTION'),
        icon: 'pi pi-folder-open',
        command: () => this.bulkRemoveCollectionDialogOpen.set(true),
      });
    }
    if (this.permissionService.hasPermission(this.permissions.Catalog.Collections.Create)) {
      items.push({
        label: t('ADMIN.CATALOG_PAGE.BULK.CREATE_COLLECTION_FROM_SELECTION'),
        icon: 'pi pi-plus-circle',
        command: () => this.bulkCreateCollectionDialogOpen.set(true),
      });
    }
    items.push({ label: t('ADMIN.CATALOG_PAGE.BULK.EXPORT'), icon: 'pi pi-download', command: () => void this.bulkExport() });
    items.push({
      label: t('ADMIN.CATALOG_PAGE.BULK.MANAGE_INVENTORY'),
      icon: 'pi pi-box',
      command: () => this.bulkOpenInventory(),
    });
    return items;
  });

  protected readonly tableFirst = computed(
    () => (this.facade.pageNumber() - 1) * this.facade.pageSize(),
  );

  protected readonly sortField = computed(() => {
    const sortBy = this.facade.sortBy();
    return sortBy ? SORT_ENUM_TO_FIELD[sortBy]?.field : undefined;
  });

  protected readonly sortOrder = computed(() => {
    const sortBy = this.facade.sortBy();
    return sortBy ? (SORT_ENUM_TO_FIELD[sortBy]?.order ?? 0) : 0;
  });

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
    const collectionIdFromRoute = this.route.snapshot.queryParamMap.get('collectionId');
    if (collectionIdFromRoute) {
      this.facade.setCollectionFilter(collectionIdFromRoute);
    } else {
      void this.facade.reload();
    }
    void this.facade.loadCategoryOptions();
    void this.facade.loadCollectionOptions();
  }

  protected onSearchChange(term: string): void {
    this.facade.setSearchTerm(term);
  }

  protected onStatusFilterChange(status: ProductStatus | ''): void {
    this.facade.setStatusFilter(status);
  }

  protected onCollectionFilterChange(collectionId: string | null): void {
    this.facade.setCollectionFilter(collectionId);
  }

  protected onClearFilters(): void {
    this.facade.clearFilters();
  }

  protected onPageChange(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.facade.pageSize();
    const first = event.first ?? 0;
    const pageNumber = Math.floor(first / rows) + 1;

    const sortField = typeof event.sortField === 'string' ? event.sortField : null;
    if (sortField && event.sortOrder) {
      const mapping = SORT_FIELD_TO_ENUM[sortField];
      this.facade.setSort(mapping ? (event.sortOrder === 1 ? mapping.asc : mapping.desc) : null);
    } else {
      this.facade.setSort(null);
    }

    this.facade.setPage(pageNumber, rows);
  }

  protected onCardsPageChange(event: { first: number; rows: number }): void {
    const pageNumber = Math.floor(event.first / event.rows) + 1;
    this.facade.setPage(pageNumber, event.rows);
  }

  protected onViewModeChange(mode: AdminProductsViewMode): void {
    this.viewModeService.setMode(mode);
  }

  protected navigateToStock(product: Product): void {
    void this.router.navigate(['/admin/products', product.id, 'edit'], { fragment: 'variants' });
  }

  protected onCategoryCreated(): void {
    void this.facade.refreshCategoryOptions();
  }

  protected onCollectionCreated(): void {
    void this.facade.refreshCollectionOptions();
  }

  protected async onCollectionsEdit(event: { product: Product; collectionIds: readonly string[] }): Promise<void> {
    await this.onFieldEdit({ product: event.product, collectionIds: event.collectionIds });
  }

  protected async onFieldEdit(edit: ProductFieldEdit): Promise<void> {
    const { product, ...patch } = edit;
    const success = await this.facade.updateProductInline(product, patch);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.CATALOG_PAGE.TOAST.UPDATED_TITLE'),
        detail: this.translate.instant('ADMIN.CATALOG_PAGE.TOAST.UPDATED_DETAIL', { name: product.nameEn }),
        life: 3000,
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Update failed',
        detail: this.facade.error() ?? 'Failed to update product.',
        life: 5000,
      });
    }
  }

  protected async onStatusEdit(edit: ProductStatusEdit): Promise<void> {
    const success = await this.facade.updateProductStatus(edit.product, edit.status);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.CATALOG_PAGE.TOAST.UPDATED_TITLE'),
        detail: this.translate.instant('ADMIN.CATALOG_PAGE.TOAST.UPDATED_DETAIL', { name: edit.product.nameEn }),
        life: 3000,
      });
    }
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

  protected onPreviewProduct(product: Product): void {
    if (product.status !== 'Active') {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('ADMIN.CATALOG_PAGE.TOAST.PREVIEW_BLOCKED_TITLE'),
        detail: this.translate.instant('ADMIN.CATALOG_PAGE.TOAST.PREVIEW_BLOCKED_DETAIL'),
        life: 4000,
      });
      return;
    }

    window.open(`/products/${product.id}`, '_blank', 'noopener');
  }

  protected openDuplicateDialog(product: Product | null = this.selectedProduct()): void {
    if (!product) {
      return;
    }

    this.actionTarget.set(product);
    this.duplicateNameSuffix.set(this.translate.instant('ADMIN.CATALOG_PAGE.DUPLICATE.DEFAULT_SUFFIX'));
    this.duplicateDialogOpen.set(true);
  }

  protected async confirmDuplicate(): Promise<void> {
    const product = this.actionTarget();
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

  protected requestDelete(product: Product | null = this.selectedProduct()): void {
    if (product) {
      this.actionTarget.set(product);
      this.deleteDialogOpen.set(true);
    }
  }

  protected async confirmDelete(): Promise<void> {
    const product = this.actionTarget();
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
    const product = this.actionTarget();
    return product
      ? this.translate.instant('ADMIN.CATALOG_PAGE.DELETE.MESSAGE', { name: product.nameEn })
      : '';
  }

  protected async onRowArchive(product: Product): Promise<void> {
    const success = await this.facade.updateProductStatus(product, 'Archived');
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.CATALOG_PAGE.TOAST.UPDATED_TITLE'),
        detail: this.translate.instant('ADMIN.CATALOG_PAGE.TOAST.UPDATED_DETAIL', { name: product.nameEn }),
        life: 4000,
      });
    }
  }

  protected retryLoad(): void {
    void this.facade.reload();
  }

  protected navigateToCreate(): void {
    void this.router.navigate(['/admin/products/new']);
  }

  @HostListener('keydown.escape')
  protected onEscapeKey(): void {
    if (this.bulkSelectedCount() > 0) {
      this.facade.clearBulkSelection();
    }
  }

  @HostListener('keydown.control.a', ['$event'])
  @HostListener('keydown.meta.a', ['$event'])
  protected onSelectAllShortcut(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    event.preventDefault();
    this.facade.selectAllOnPage();
  }

  protected onBulkToggle(event: { productId: string; shiftKey: boolean }): void {
    if (event.shiftKey && this.bulkAnchorId()) {
      const orderedIds = this.items().map((product) => product.id);
      const range = computeRangeIds(orderedIds, this.bulkAnchorId()!, event.productId);
      this.facade.setBulkSelection([...new Set([...this.bulkSelectedIds(), ...range])]);
    } else {
      this.facade.toggleBulkSelect(event.productId);
    }

    this.bulkAnchorId.set(event.productId);
  }

  protected onBulkToggleAllPage(selectAll: boolean): void {
    if (selectAll) {
      this.facade.selectAllOnPage();
    } else {
      this.facade.clearBulkSelection();
    }
  }

  protected selectAllMatchingFilter(): void {
    this.facade.selectAllMatchingFilter();
  }

  protected clearBulkSelection(): void {
    this.facade.clearBulkSelection();
  }

  protected async bulkPublish(): Promise<void> {
    await this.runBulkAction(() => this.facade.bulkPublish(), 'Published');
  }

  protected async bulkUnpublish(): Promise<void> {
    await this.runBulkAction(() => this.facade.bulkUnpublish(), 'Unpublished');
  }

  protected async bulkArchive(): Promise<void> {
    await this.runBulkAction(() => this.facade.bulkArchive(), 'Archived');
  }

  protected requestBulkDelete(): void {
    this.bulkDeleteDialogOpen.set(true);
  }

  protected async confirmBulkDelete(): Promise<void> {
    await this.runBulkAction(() => this.facade.bulkDelete(), 'Deleted');
    this.bulkDeleteDialogOpen.set(false);
  }

  protected async confirmBulkDuplicate(): Promise<void> {
    await this.runBulkAction(() => this.facade.bulkDuplicate(this.bulkDuplicateSuffix().trim() || null), 'Duplicated');
    this.bulkDuplicateDialogOpen.set(false);
  }

  protected async confirmBulkCategoryChange(): Promise<void> {
    const categoryId = this.bulkTargetCategoryId();
    if (!categoryId) {
      return;
    }

    await this.runBulkAction(() => this.facade.bulkChangeCategory(categoryId), 'Category updated');
    this.bulkCategoryDialogOpen.set(false);
  }

  protected async confirmBulkAssignCollection(): Promise<void> {
    const collectionId = this.bulkTargetCollectionId();
    if (!collectionId) {
      return;
    }

    await this.runBulkAction(() => this.facade.bulkAssignCollection(collectionId), 'Collection assigned');
    this.bulkAssignCollectionDialogOpen.set(false);
  }

  protected async confirmBulkRemoveCollection(): Promise<void> {
    const collectionId = this.bulkTargetCollectionId();
    if (!collectionId) {
      return;
    }

    await this.runBulkAction(() => this.facade.bulkRemoveCollection(collectionId), 'Collection removed');
    this.bulkRemoveCollectionDialogOpen.set(false);
  }

  protected async confirmBulkCreateCollection(): Promise<void> {
    const name = this.bulkNewCollectionName().trim();
    if (!name) {
      return;
    }

    await this.runBulkAction(() => this.facade.createCollectionFromSelectionAndAssign(name), 'Collection created');
    this.bulkCreateCollectionDialogOpen.set(false);
    this.bulkNewCollectionName.set('');
  }

  protected async confirmBulkPriceAdjust(): Promise<void> {
    const value = this.bulkPriceValue();
    if (value === null) {
      return;
    }

    await this.runBulkAction(() => this.facade.bulkAdjustPrice(this.bulkPriceMode(), value), 'Prices updated');
    this.bulkPriceDialogOpen.set(false);
  }

  protected async bulkExport(): Promise<void> {
    const blob = await this.facade.exportSelected();
    if (!blob) {
      return;
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `products-export-${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  /** Opens each selected product's Edit-page inventory tab in a new browser tab — capped so
   * "manage inventory for 400 selected products" doesn't try to spawn 400 tabs. */
  protected bulkOpenInventory(): void {
    const ids = this.selectAllMatchingActive() ? [] : [...this.bulkSelectedIds()];
    const cap = 10;

    if (this.selectAllMatchingActive() || ids.length > cap) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Too many products selected',
        detail: `Select fewer than ${cap} products to open their inventory individually.`,
      });
      return;
    }

    for (const id of ids) {
      window.open(`/admin/products/${id}/edit#variants`, '_blank');
    }
  }

  private async runBulkAction(
    action: () => Promise<{ successCount: number; errorCount: number; errors: readonly string[] } | null>,
    verb: string,
  ): Promise<void> {
    const result = await action();
    if (!result) {
      return;
    }

    if (result.errorCount === 0) {
      this.messageService.add({
        severity: 'success',
        summary: verb,
        detail: `${result.successCount} product(s) updated.`,
        life: 4000,
      });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: `${verb} with errors`,
        detail: `${result.successCount} succeeded, ${result.errorCount} failed.`,
        life: 6000,
      });
    }
  }
}

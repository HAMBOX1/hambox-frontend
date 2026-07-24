import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';

import { ApiError } from '../../../core/models/api-error.model';
import { CategoryOption } from '../models/category.model';
import { CollectionOption } from '../models/collection.model';
import {
  BulkProductsResult,
  PriceAdjustmentMode,
  Product,
  ProductBulkSelection,
  ProductSortBy,
  ProductStatus,
  UpdateProductRequest,
} from '../models/product.model';
import { toUpdateProductRequest } from '../utils/product-display.utils';
import { CategoryApiService } from './category-api.service';
import { CollectionApiService } from './collection-api.service';
import { ProductApiService } from './product-api.service';

const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

@Injectable()
export class ProductCatalogFacade {
  private readonly api = inject(ProductApiService);
  private readonly categoryApi = inject(CategoryApiService);
  private readonly collectionApi = inject(CollectionApiService);

  private readonly itemsState = signal<readonly Product[]>([]);
  private readonly loadingState = signal(false);
  private readonly searchTermState = signal('');
  private readonly statusFilterState = signal('');
  private readonly sortByState = signal<ProductSortBy | null>(null);
  private readonly errorState = signal<string | null>(null);
  private readonly totalCountState = signal(0);
  private readonly pageNumberState = signal(1);
  private readonly pageSizeState = signal(DEFAULT_PAGE_SIZE);
  private readonly selectedProductIdState = signal<string | null>(null);
  private readonly updatingStatusState = signal(false);
  private readonly actionLoadingState = signal(false);
  private readonly statusErrorState = signal<string | null>(null);
  private readonly categoryOptionsState = signal<readonly CategoryOption[]>([]);
  private categoryOptionsLoaded = false;
  private readonly collectionOptionsState = signal<readonly CollectionOption[]>([]);
  private collectionOptionsLoaded = false;
  private readonly collectionFilterState = signal<string | null>(null);

  // Bulk multi-select — a Set for O(1) toggle/lookup regardless of catalog size (see the variant
  // manager's array+`.includes()` pattern for the O(n²) shape this avoids). Never cleared by
  // setPage/setSort/setSearchTerm/setStatusFilter — only by an explicit clear or a successful
  // bulk action — so it survives sorting/filtering/searching/pagination as required.
  private readonly bulkSelectedIdsState = signal<ReadonlySet<string>>(new Set());
  private readonly selectAllMatchingState = signal(false);
  private readonly bulkActionLoadingState = signal(false);
  private readonly bulkErrorState = signal<string | null>(null);

  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  private hasLoaded = false;

  readonly items = this.itemsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly searchTerm = this.searchTermState.asReadonly();
  readonly statusFilter = this.statusFilterState.asReadonly();
  readonly sortBy = this.sortByState.asReadonly();
  readonly categoryOptions = this.categoryOptionsState.asReadonly();
  readonly collectionOptions = this.collectionOptionsState.asReadonly();
  readonly collectionFilter = this.collectionFilterState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly totalCount = this.totalCountState.asReadonly();
  readonly pageNumber = this.pageNumberState.asReadonly();
  readonly pageSize = this.pageSizeState.asReadonly();
  readonly selectedProductId = this.selectedProductIdState.asReadonly();
  readonly updatingStatus = this.updatingStatusState.asReadonly();
  readonly actionLoading = this.actionLoadingState.asReadonly();
  readonly statusError = this.statusErrorState.asReadonly();

  readonly hasActiveSearch = computed(() => this.searchTermState().trim().length > 0);
  readonly hasActiveFilters = computed(
    () => this.hasActiveSearch() || this.statusFilterState().trim().length > 0 || this.collectionFilterState() !== null,
  );
  readonly isEmpty = computed(() => !this.loading() && this.items().length === 0);

  readonly selectedProduct = computed(() => {
    const selectedId = this.selectedProductIdState();

    if (!selectedId) {
      return null;
    }

    return this.itemsState().find((product) => product.id === selectedId) ?? null;
  });

  readonly bulkSelectedIds = this.bulkSelectedIdsState.asReadonly();
  readonly selectAllMatchingActive = this.selectAllMatchingState.asReadonly();
  readonly bulkActionLoading = this.bulkActionLoadingState.asReadonly();
  readonly bulkError = this.bulkErrorState.asReadonly();

  readonly bulkSelectedCount = computed(() =>
    this.selectAllMatchingState() ? this.totalCountState() : this.bulkSelectedIdsState().size,
  );

  readonly isAllPageSelected = computed(() => {
    const items = this.itemsState();
    if (items.length === 0) {
      return false;
    }

    const ids = this.bulkSelectedIdsState();
    return this.selectAllMatchingState() || items.every((product) => ids.has(product.id));
  });

  /** Show the "select all N matching your filter" prompt only once the whole loaded page is
   * checked and there's more beyond it. */
  readonly canOfferSelectAllMatching = computed(
    () => this.isAllPageSelected() && !this.selectAllMatchingState() && this.totalCountState() > this.itemsState().length,
  );

  setSearchTerm(term: string): void {
    this.searchTermState.set(term);
    this.pageNumberState.set(1);
    this.scheduleReload();
  }

  setStatusFilter(status: string): void {
    this.statusFilterState.set(status);
    this.pageNumberState.set(1);
    void this.fetchProducts();
  }

  /** Also settable directly from a Collections-page "View products" navigation
   * (see `CollectionListPageComponent.viewProducts`), which lands here via a query param. */
  setCollectionFilter(collectionId: string | null): void {
    this.collectionFilterState.set(collectionId);
    this.pageNumberState.set(1);
    void this.fetchProducts();
  }

  clearFilters(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchTermState.set('');
    this.statusFilterState.set('');
    this.collectionFilterState.set(null);
    this.pageNumberState.set(1);
    void this.fetchProducts();
  }

  setSort(sortBy: ProductSortBy | null): void {
    if (this.sortByState() === sortBy) {
      return;
    }

    this.sortByState.set(sortBy);
    this.pageNumberState.set(1);
    void this.fetchProducts();
  }

  async loadCategoryOptions(): Promise<void> {
    if (this.categoryOptionsLoaded) {
      return;
    }

    this.categoryOptionsLoaded = true;
    await this.fetchCategoryOptions();
  }

  /** Force-refetches categories — used after creating one inline (e.g. from the category popover). */
  async refreshCategoryOptions(): Promise<void> {
    this.categoryOptionsLoaded = true;
    await this.fetchCategoryOptions();
  }

  private async fetchCategoryOptions(): Promise<void> {
    try {
      const result = await firstValueFrom(
        this.categoryApi.getCategories({ pageNumber: 1, pageSize: 100, activeOnly: true }),
      );
      this.categoryOptionsState.set(
        (result.items ?? []).map((category) => ({
          id: category.id,
          label: category.nameEn,
          parentId: category.parentId,
        })),
      );
    } catch {
      this.categoryOptionsLoaded = false;
    }
  }

  async loadCollectionOptions(): Promise<void> {
    if (this.collectionOptionsLoaded) {
      return;
    }

    this.collectionOptionsLoaded = true;
    await this.fetchCollectionOptions();
  }

  /** Force-refetches collections — used after creating one inline (e.g. from the collections popover). */
  async refreshCollectionOptions(): Promise<void> {
    this.collectionOptionsLoaded = true;
    await this.fetchCollectionOptions();
  }

  private async fetchCollectionOptions(): Promise<void> {
    try {
      const result = await firstValueFrom(
        this.collectionApi.getCollections({ pageNumber: 1, pageSize: 200 }),
      );
      this.collectionOptionsState.set(
        (result.items ?? []).map((collection) => ({
          id: collection.id,
          label: collection.name,
          parentId: collection.parentId,
        })),
      );
    } catch {
      this.collectionOptionsLoaded = false;
    }
  }

  async updateProductInline(
    product: Product,
    patch: Partial<
      Pick<UpdateProductRequest, 'nameEn' | 'categoryId' | 'additionalCategoryIds' | 'collectionIds' | 'price'>
    >,
  ): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.errorState.set(null);

    try {
      const request = { ...toUpdateProductRequest(product, product.status), ...patch };
      await firstValueFrom(this.api.updateProduct(product.id, request));
      await this.fetchProducts(true);
      return true;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to update product.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  setPage(pageNumber: number, pageSize: number): void {
    if (this.pageNumberState() === pageNumber && this.pageSizeState() === pageSize && this.hasLoaded) {
      return;
    }

    this.pageNumberState.set(pageNumber);
    this.pageSizeState.set(pageSize);
    void this.fetchProducts();
  }

  selectProduct(productId: string): void {
    this.selectedProductIdState.set(productId);
    this.statusErrorState.set(null);
  }

  clearSelection(): void {
    this.selectedProductIdState.set(null);
    this.statusErrorState.set(null);
  }

  async updateProductStatus(product: Product, status: ProductStatus): Promise<boolean> {
    if (product.status === status) {
      return true;
    }

    this.updatingStatusState.set(true);
    this.statusErrorState.set(null);

    try {
      if (status === 'Active') {
        await firstValueFrom(this.api.publishProduct(product.id));
      } else if (status === 'Inactive') {
        await firstValueFrom(this.api.deactivateProduct(product.id));
      } else if (status === 'Archived') {
        await firstValueFrom(this.api.archiveProduct(product.id));
      } else {
        await firstValueFrom(
          this.api.updateProduct(product.id, toUpdateProductRequest(product, status)),
        );
      }

      await this.fetchProducts(true);
      return true;
    } catch (error) {
      this.statusErrorState.set(this.toErrorMessage(error, 'Failed to update product status.'));
      return false;
    } finally {
      this.updatingStatusState.set(false);
    }
  }

  async deleteProduct(productId: string): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.errorState.set(null);

    try {
      await firstValueFrom(this.api.deleteProduct(productId));
      if (this.selectedProductIdState() === productId) {
        this.selectedProductIdState.set(null);
      }
      await this.fetchProducts(true);
      return true;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to delete product.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async duplicateProduct(productId: string, nameSuffix?: string | null): Promise<string | null> {
    this.actionLoadingState.set(true);
    this.errorState.set(null);

    try {
      const newId = await firstValueFrom(this.api.duplicateProduct(productId, nameSuffix));
      await this.fetchProducts(true);
      return newId;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to duplicate product.'));
      return null;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async publishProduct(productId: string): Promise<boolean> {
    return this.runProductAction(productId, () => firstValueFrom(this.api.publishProduct(productId)));
  }

  async archiveProduct(productId: string): Promise<boolean> {
    return this.runProductAction(productId, () => firstValueFrom(this.api.archiveProduct(productId)));
  }

  async restoreProduct(productId: string): Promise<boolean> {
    return this.runProductAction(productId, () => firstValueFrom(this.api.restoreProduct(productId)));
  }

  reload(): Promise<void> {
    return this.fetchProducts(true);
  }

  toggleBulkSelect(productId: string): void {
    this.selectAllMatchingState.set(false);
    this.bulkSelectedIdsState.update((current) => {
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }

  /** Applies a shift-click range (or any explicit id list) as the selection, replacing individual toggles. */
  setBulkSelection(productIds: readonly string[]): void {
    this.selectAllMatchingState.set(false);
    this.bulkSelectedIdsState.set(new Set(productIds));
  }

  selectAllOnPage(): void {
    this.selectAllMatchingState.set(false);
    this.bulkSelectedIdsState.set(new Set(this.itemsState().map((product) => product.id)));
  }

  selectAllMatchingFilter(): void {
    this.selectAllMatchingState.set(true);
  }

  clearBulkSelection(): void {
    this.selectAllMatchingState.set(false);
    this.bulkSelectedIdsState.set(new Set());
    this.bulkErrorState.set(null);
  }

  private currentBulkSelection(): ProductBulkSelection {
    if (this.selectAllMatchingState()) {
      const status = this.statusFilterState().trim();
      return {
        selectAllMatching: true,
        searchTerm: this.searchTermState().trim() || undefined,
        status: status ? (status as ProductStatus) : undefined,
      };
    }

    return { productIds: [...this.bulkSelectedIdsState()], selectAllMatching: false };
  }

  async bulkPublish(): Promise<BulkProductsResult | null> {
    return this.runBulkAction(() => this.api.bulkProducts(this.currentBulkSelection(), 'publish'));
  }

  async bulkUnpublish(): Promise<BulkProductsResult | null> {
    return this.runBulkAction(() => this.api.bulkProducts(this.currentBulkSelection(), 'unpublish'));
  }

  async bulkArchive(): Promise<BulkProductsResult | null> {
    return this.runBulkAction(() => this.api.bulkProducts(this.currentBulkSelection(), 'archive'));
  }

  async bulkChangeCategory(targetCategoryId: string): Promise<BulkProductsResult | null> {
    return this.runBulkAction(() =>
      this.api.bulkProducts(this.currentBulkSelection(), 'change-category', { targetCategoryId }),
    );
  }

  async bulkAdjustPrice(priceMode: PriceAdjustmentMode, priceValue: number): Promise<BulkProductsResult | null> {
    return this.runBulkAction(() =>
      this.api.bulkProducts(this.currentBulkSelection(), 'adjust-price', { priceMode, priceValue }),
    );
  }

  async bulkAssignCollection(targetCollectionId: string): Promise<BulkProductsResult | null> {
    return this.runBulkAction(() =>
      this.api.bulkProducts(this.currentBulkSelection(), 'assign-collection', { targetCollectionId }),
    );
  }

  async bulkRemoveCollection(targetCollectionId: string): Promise<BulkProductsResult | null> {
    return this.runBulkAction(() =>
      this.api.bulkProducts(this.currentBulkSelection(), 'remove-collection', { targetCollectionId }),
    );
  }

  /** "Create Collection From Selection" — a frontend-only orchestration (no dedicated backend
   * endpoint): create the collection, then bulk-assign the current selection to it. */
  async createCollectionFromSelectionAndAssign(name: string): Promise<BulkProductsResult | null> {
    try {
      const collectionId = await firstValueFrom(this.collectionApi.createCollection({ name }));
      await this.refreshCollectionOptions();
      return await this.bulkAssignCollection(collectionId);
    } catch (error) {
      this.bulkErrorState.set(this.toErrorMessage(error, 'Failed to create collection.'));
      return null;
    }
  }

  async bulkDelete(): Promise<BulkProductsResult | null> {
    return this.runBulkAction(() => this.api.bulkDeleteProducts(this.currentBulkSelection()));
  }

  async bulkDuplicate(nameSuffix?: string | null): Promise<BulkProductsResult | null> {
    return this.runBulkAction(() => this.api.bulkDuplicateProducts(this.currentBulkSelection(), nameSuffix));
  }

  async exportSelected(): Promise<Blob | null> {
    this.bulkActionLoadingState.set(true);
    this.bulkErrorState.set(null);

    try {
      return await firstValueFrom(this.api.exportProducts(this.currentBulkSelection()));
    } catch (error) {
      this.bulkErrorState.set(this.toErrorMessage(error, 'Failed to export products.'));
      return null;
    } finally {
      this.bulkActionLoadingState.set(false);
    }
  }

  private async runBulkAction(
    action: () => Observable<BulkProductsResult>,
  ): Promise<BulkProductsResult | null> {
    this.bulkActionLoadingState.set(true);
    this.bulkErrorState.set(null);

    try {
      const result = await firstValueFrom(action());
      this.clearBulkSelection();
      await this.fetchProducts(true);
      return result;
    } catch (error) {
      this.bulkErrorState.set(this.toErrorMessage(error, 'Bulk action failed.'));
      return null;
    } finally {
      this.bulkActionLoadingState.set(false);
    }
  }

  private async runProductAction(productId: string, action: () => Promise<void>): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.errorState.set(null);

    try {
      await action();
      await this.fetchProducts(true);
      this.selectedProductIdState.set(productId);
      return true;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Product action failed.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  private scheduleReload(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      void this.fetchProducts();
    }, SEARCH_DEBOUNCE_MS);
  }

  private async fetchProducts(force = false): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const status = this.statusFilterState().trim();
      const sortBy = this.sortByState();
      const collectionId = this.collectionFilterState();
      const result = await firstValueFrom(
        this.api.getProducts({
          pageNumber: this.pageNumberState(),
          pageSize: this.pageSizeState(),
          searchTerm: this.searchTermState(),
          ...(status ? { status: status as ProductStatus } : {}),
          ...(sortBy ? { sortBy } : {}),
          ...(collectionId ? { collectionId } : {}),
        }),
      );

      const items = result.items ?? [];
      this.itemsState.set(items);
      this.totalCountState.set(result.totalCount ?? 0);
      this.pageNumberState.set(result.pageNumber ?? this.pageNumberState());
      this.pageSizeState.set(result.pageSize ?? this.pageSizeState());
      this.hasLoaded = true;
      this.syncSelection(items);
    } catch (error) {
      this.itemsState.set([]);
      this.totalCountState.set(0);
      this.selectedProductIdState.set(null);
      this.errorState.set(this.toErrorMessage(error, 'Failed to load products.'));
    } finally {
      this.loadingState.set(false);
    }
  }

  private syncSelection(items: readonly Product[]): void {
    const selectedId = this.selectedProductIdState();

    if (selectedId && !items.some((product) => product.id === selectedId)) {
      this.selectedProductIdState.set(null);
    }
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403) {
        return 'You do not have permission to update products. Sign in with an admin account.';
      }

      return error.message;
    }

    return fallback;
  }
}

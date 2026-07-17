import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../core/models/api-error.model';
import { Product, ProductStatus } from '../models/product.model';
import { toUpdateProductRequest } from '../utils/product-display.utils';
import { ProductApiService } from './product-api.service';

const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

@Injectable()
export class ProductCatalogFacade {
  private readonly api = inject(ProductApiService);

  private readonly itemsState = signal<readonly Product[]>([]);
  private readonly loadingState = signal(false);
  private readonly searchTermState = signal('');
  private readonly statusFilterState = signal('');
  private readonly errorState = signal<string | null>(null);
  private readonly totalCountState = signal(0);
  private readonly pageNumberState = signal(1);
  private readonly pageSizeState = signal(DEFAULT_PAGE_SIZE);
  private readonly selectedProductIdState = signal<string | null>(null);
  private readonly updatingStatusState = signal(false);
  private readonly actionLoadingState = signal(false);
  private readonly statusErrorState = signal<string | null>(null);

  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  private hasLoaded = false;

  readonly items = this.itemsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly searchTerm = this.searchTermState.asReadonly();
  readonly statusFilter = this.statusFilterState.asReadonly();
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
    () => this.hasActiveSearch() || this.statusFilterState().trim().length > 0,
  );
  readonly isEmpty = computed(() => !this.loading() && this.items().length === 0);

  readonly selectedProduct = computed(() => {
    const selectedId = this.selectedProductIdState();

    if (!selectedId) {
      return null;
    }

    return this.itemsState().find((product) => product.id === selectedId) ?? null;
  });

  readonly subtitle = computed(() => {
    const count = this.totalCount();
    const noun = count === 1 ? 'listing' : 'listings';

    if (this.hasActiveFilters()) {
      return `Showing ${count} matching enterprise ${noun}`;
    }

    return `Managing ${count} active enterprise ${noun}`;
  });

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

  clearFilters(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchTermState.set('');
    this.statusFilterState.set('');
    this.pageNumberState.set(1);
    void this.fetchProducts();
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
      const result = await firstValueFrom(
        this.api.getProducts({
          pageNumber: this.pageNumberState(),
          pageSize: this.pageSizeState(),
          searchTerm: this.searchTermState(),
          ...(status ? { status: status as ProductStatus } : {}),
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

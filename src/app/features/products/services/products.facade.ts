import { computed, inject, Injectable, signal } from '@angular/core';

import { ApiError } from '../../../core/models/api-error.model';
import { StoreCategoryPill, StoreProduct, StoreSortOption } from '../models/product';
import { STOREFRONT_SORT_OPTIONS } from '../services/storefront-products-data';
import { mapProductToStoreProduct } from '../utils/storefront-product.mapper';
import { Products } from './products';

const DEFAULT_PAGE_SIZE = 12;

@Injectable()
export class ProductsFacade {
  private readonly productsService = inject(Products);

  private readonly itemsState = signal<readonly StoreProduct[]>([]);
  private readonly categoriesState = signal<readonly StoreCategoryPill[]>([
    { id: 'all', label: 'All Items' },
  ]);
  private readonly loadingState = signal(false);
  private readonly loadingMoreState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly searchTermState = signal('');
  private readonly categoryIdState = signal('all');
  private readonly sortState = signal<StoreSortOption['value']>('popular');
  private readonly pageNumberState = signal(1);
  private readonly pageSizeState = signal(DEFAULT_PAGE_SIZE);
  private readonly totalCountState = signal(0);

  readonly items = this.itemsState.asReadonly();
  readonly categories = this.categoriesState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly loadingMore = this.loadingMoreState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly searchTerm = this.searchTermState.asReadonly();
  readonly selectedCategoryId = this.categoryIdState.asReadonly();
  readonly selectedSort = this.sortState.asReadonly();
  readonly sortOptions = signal<readonly StoreSortOption[]>(STOREFRONT_SORT_OPTIONS).asReadonly();
  readonly totalCount = this.totalCountState.asReadonly();

  readonly hasMore = computed(() => this.itemsState().length < this.totalCountState());
  readonly isEmpty = computed(() => !this.loading() && this.itemsState().length === 0);
  readonly hasActiveSearch = computed(() => this.searchTermState().trim().length > 0);

  async initialize(searchTerm = '', categoryId = 'all'): Promise<void> {
    this.searchTermState.set(searchTerm);
    this.categoryIdState.set(categoryId);
    this.pageNumberState.set(1);
    await Promise.all([this.loadCategories(), this.fetchProducts(true)]);
  }

  setSearchTerm(term: string): void {
    this.searchTermState.set(term);
    this.pageNumberState.set(1);
    void this.fetchProducts(true);
  }

  setCategory(categoryId: string): void {
    this.categoryIdState.set(categoryId);
    this.pageNumberState.set(1);
    void this.fetchProducts(true);
  }

  setSort(sort: StoreSortOption['value']): void {
    this.sortState.set(sort);
    this.itemsState.set(this.sortProducts(this.itemsState()));
  }

  async loadMore(): Promise<void> {
    if (this.loading() || this.loadingMore() || !this.hasMore()) {
      return;
    }

    this.pageNumberState.update((page) => page + 1);
    await this.fetchProducts(false, true);
  }

  retry(): Promise<void> {
    this.pageNumberState.set(1);
    return this.fetchProducts(true);
  }

  private async loadCategories(): Promise<void> {
    try {
      const categories = await this.productsService.getCategoryPills();
      this.categoriesState.set(categories);
    } catch {
      this.categoriesState.set([{ id: 'all', label: 'All Items' }]);
    }
  }

  private async fetchProducts(reset: boolean, append = false): Promise<void> {
    if (append) {
      this.loadingMoreState.set(true);
    } else {
      this.loadingState.set(true);
    }

    this.errorState.set(null);

    try {
      const result = await this.productsService.getActiveProducts({
        pageNumber: this.pageNumberState(),
        pageSize: this.pageSizeState(),
        searchTerm: this.searchTermState(),
        categoryId: this.categoryIdState() === 'all' ? undefined : this.categoryIdState(),
      });

      const mapped = (result.items ?? []).map((product, index) =>
        mapProductToStoreProduct(product, index),
      );
      const sorted = this.sortProducts(mapped);

      this.itemsState.set(
        append ? [...this.itemsState(), ...sorted] : sorted,
      );
      this.totalCountState.set(result.totalCount ?? 0);

      if (!append) {
        this.pageNumberState.set(result.pageNumber ?? 1);
      }
    } catch (error) {
      if (!append) {
        this.itemsState.set([]);
        this.totalCountState.set(0);
      }

      this.errorState.set(this.toErrorMessage(error, 'Failed to load products.'));
    } finally {
      this.loadingState.set(false);
      this.loadingMoreState.set(false);
    }
  }

  private sortProducts(products: readonly StoreProduct[]): StoreProduct[] {
    const items = [...products];

    switch (this.sortState()) {
      case 'price-asc':
        return items.sort((left, right) => left.priceUsd - right.priceUsd);
      case 'price-desc':
        return items.sort((left, right) => right.priceUsd - left.priceUsd);
      case 'newest':
        return items;
      case 'popular':
      default:
        return items.sort((left, right) => Number(right.highlighted) - Number(left.highlighted));
    }
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      return error.message;
    }

    return fallback;
  }
}

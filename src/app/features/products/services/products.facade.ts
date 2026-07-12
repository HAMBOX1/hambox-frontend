import { computed, inject, Injectable, signal } from '@angular/core';

import { ProductSortBy } from '../../catalog/models/product.model';
import { ApiError } from '../../../core/models/api-error.model';
import { StoreCategoryPill, StoreProduct, StoreSortOption } from '../models/product';
import { STOREFRONT_SORT_OPTIONS } from '../services/storefront-products-data';
import { StorefrontProductEnrichmentService } from '../services/storefront-product-enrichment.service';
import { mapProductToStoreProduct } from '../utils/storefront-product.mapper';
import {
  buildDynamicFilterGroups,
  countActiveAttributeFilters,
  lowestPurchasablePrice,
  matchesEnhancedSearch,
  productMatchesAttributeFilters,
  productPassesStockFilter,
} from '../utils/storefront-filter.util';
import {
  computeProductStockStatus,
  hasPurchasableInventory,
} from '../utils/storefront-product-stock.util';
import {
  productRequiresOptionSelection,
  resolveDirectCartVariantId,
} from '../utils/storefront-add-to-cart.util';
import { Products } from './products';

const DEFAULT_PAGE_SIZE = 12;
const DEFAULT_SECTION = 'games';

export interface StorefrontClientFilters {
  readonly minPrice: number | null;
  readonly maxPrice: number | null;
  readonly inStockOnly: boolean;
  readonly attributes: Readonly<Record<string, readonly string[]>>;
}

const EMPTY_CLIENT_FILTERS: StorefrontClientFilters = {
  minPrice: null,
  maxPrice: null,
  inStockOnly: false,
  attributes: {},
};

export interface StorefrontAppliedFilterChip {
  readonly id: string;
  readonly label: string;
  readonly type: 'price-min' | 'price-max' | 'stock' | 'attribute';
  readonly groupId?: string;
  readonly optionId?: string;
}

@Injectable()
export class ProductsFacade {
  private readonly productsService = inject(Products);
  private readonly enrichment = inject(StorefrontProductEnrichmentService);

  private readonly itemsState = signal<readonly StoreProduct[]>([]);
  private readonly categoriesState = signal<readonly StoreCategoryPill[]>([
    { id: 'all', label: 'All Items' },
  ]);
  private readonly loadingState = signal(false);
  private readonly loadingMoreState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly searchTermState = signal('');
  private readonly categoryIdState = signal('all');
  private readonly sectionState = signal(DEFAULT_SECTION);
  private readonly sortState = signal<StoreSortOption['value']>('featured');
  private readonly pageNumberState = signal(1);
  private readonly pageSizeState = signal(DEFAULT_PAGE_SIZE);
  private readonly totalCountState = signal(0);
  private readonly clientFiltersState = signal<StorefrontClientFilters>(EMPTY_CLIENT_FILTERS);

  readonly items = this.itemsState.asReadonly();
  readonly categories = this.categoriesState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly loadingMore = this.loadingMoreState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly searchTerm = this.searchTermState.asReadonly();
  readonly selectedCategoryId = this.categoryIdState.asReadonly();
  readonly selectedSection = this.sectionState.asReadonly();
  readonly selectedSort = this.sortState.asReadonly();
  readonly clientFilters = this.clientFiltersState.asReadonly();
  readonly sortOptions = signal<readonly StoreSortOption[]>(STOREFRONT_SORT_OPTIONS).asReadonly();
  readonly totalCount = this.totalCountState.asReadonly();
  readonly pageNumber = this.pageNumberState.asReadonly();
  readonly pageSize = this.pageSizeState.asReadonly();
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalCountState() / this.pageSizeState())),
  );
  readonly configurations = this.enrichment.configurations;

  readonly enrichedItems = computed(() => {
    const configurations = this.enrichment.configurations();

    return this.itemsState().map((product) => {
      const configuration = configurations[product.id];
      const stockStatus = computeProductStockStatus(configuration, !product.outOfStock);
      const inStock = hasPurchasableInventory(configuration, !product.outOfStock);
      const displayPrice = configuration
        ? lowestPurchasablePrice(configuration, product.priceUsd)
        : product.priceUsd;

      return {
        ...product,
        priceUsd: displayPrice,
        stockStatus,
        outOfStock: stockStatus === 'out-of-stock',
        cta: inStock ? product.cta : 'notify-me',
        requiresOptionSelection: productRequiresOptionSelection(configuration),
        directVariantId: resolveDirectCartVariantId(configuration),
      };
    });
  });

  readonly dynamicFilterGroups = computed(() =>
    buildDynamicFilterGroups(this.enrichedItems(), this.enrichment.configurations()),
  );

  readonly displayItems = computed(() => {
    const filtered = this.applyClientFilters(this.enrichedItems());
    return this.applyClientSort(filtered);
  });

  readonly hasMore = computed(() => this.itemsState().length < this.totalCountState());
  readonly isEmpty = computed(() => !this.loading() && this.displayItems().length === 0);
  readonly hasActiveSearch = computed(() => this.searchTermState().trim().length > 0);

  readonly activeFilterCount = computed(() => {
    const filters = this.clientFiltersState();
    let count = 0;
    if (filters.minPrice !== null) count += 1;
    if (filters.maxPrice !== null) count += 1;
    if (filters.inStockOnly) count += 1;
    count += countActiveAttributeFilters(filters.attributes);
    return count;
  });

  readonly hasActiveClientFilters = computed(() => this.activeFilterCount() > 0);

  readonly appliedFilterChips = computed((): readonly StorefrontAppliedFilterChip[] => {
    const filters = this.clientFiltersState();
    const groups = this.dynamicFilterGroups();
    const chips: StorefrontAppliedFilterChip[] = [];

    if (filters.minPrice !== null) {
      chips.push({
        id: 'price-min',
        label: `Min $${filters.minPrice}`,
        type: 'price-min',
      });
    }

    if (filters.maxPrice !== null) {
      chips.push({
        id: 'price-max',
        label: `Max $${filters.maxPrice}`,
        type: 'price-max',
      });
    }

    if (filters.inStockOnly) {
      chips.push({
        id: 'stock-only',
        label: 'In stock only',
        type: 'stock',
      });
    }

    for (const [groupId, optionIds] of Object.entries(filters.attributes)) {
      const group = groups.find((entry) => entry.id === groupId);
      for (const optionId of optionIds) {
        const option = group?.options.find((entry) => entry.id === optionId);
        chips.push({
          id: `attribute:${groupId}:${optionId}`,
          label: `${group?.label ?? groupId}: ${option?.label ?? optionId}`,
          type: 'attribute',
          groupId,
          optionId,
        });
      }
    }

    return chips;
  });

  async initialize(searchTerm = '', categoryId = 'all', section = DEFAULT_SECTION): Promise<void> {
    this.searchTermState.set(searchTerm);
    this.categoryIdState.set(categoryId);
    this.sectionState.set(section);
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

  setSection(section: string): void {
    this.sectionState.set(section || DEFAULT_SECTION);
  }

  setSort(sort: StoreSortOption['value']): void {
    this.sortState.set(sort);
    if (this.isServerSort(sort)) {
      this.pageNumberState.set(1);
      void this.fetchProducts(true);
    }
  }

  setClientFilters(filters: StorefrontClientFilters): void {
    this.clientFiltersState.set(filters);
  }

  resetClientFilters(): void {
    this.clientFiltersState.set(EMPTY_CLIENT_FILTERS);
  }

  removeAppliedFilter(chipId: string): void {
    const chip = this.appliedFilterChips().find((entry) => entry.id === chipId);
    if (!chip) {
      return;
    }

    const current = this.clientFiltersState();

    switch (chip.type) {
      case 'price-min':
        this.clientFiltersState.set({ ...current, minPrice: null });
        break;
      case 'price-max':
        this.clientFiltersState.set({ ...current, maxPrice: null });
        break;
      case 'stock':
        this.clientFiltersState.set({ ...current, inStockOnly: false });
        break;
      case 'attribute':
        if (!chip.groupId || !chip.optionId) {
          return;
        }

        this.clientFiltersState.set({
          ...current,
          attributes: {
            ...current.attributes,
            [chip.groupId]: (current.attributes[chip.groupId] ?? []).filter(
              (optionId) => optionId !== chip.optionId,
            ),
          },
        });
        break;
    }
  }

  async loadMore(): Promise<void> {
    if (this.loading() || this.loadingMore() || !this.hasMore()) {
      return;
    }

    this.pageNumberState.update((page) => page + 1);
    await this.fetchProducts(false, true);
  }

  async goToPage(page: number): Promise<void> {
    if (page < 1 || page === this.pageNumberState()) {
      return;
    }

    this.pageNumberState.set(page);
    await this.fetchProducts(true);
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
        sortBy: this.mapSortToApi(this.sortState()),
      });

      const baseIndex = append ? this.itemsState().length : 0;
      const mapped = (result.items ?? []).map((product, index) =>
        mapProductToStoreProduct(product, baseIndex + index),
      );

      const nextItems = append ? [...this.itemsState(), ...mapped] : mapped;
      this.itemsState.set(nextItems);
      this.totalCountState.set(result.totalCount ?? 0);

      if (!append) {
        this.pageNumberState.set(result.pageNumber ?? 1);
      }

      void this.enrichment.ensureLoaded(nextItems.map((product) => product.id));
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

  private applyClientFilters(products: readonly StoreProduct[]): readonly StoreProduct[] {
    const filters = this.clientFiltersState();
    const section = this.sectionState();
    const configurations = this.enrichment.configurations();
    const localSearch = this.searchTermState().trim();

    return products.filter((product) => {
      const configuration = configurations[product.id];

      if (!this.matchesSection(product, section)) {
        return false;
      }

      if (localSearch && !matchesEnhancedSearch(product, configuration, localSearch)) {
        return false;
      }

      if (filters.minPrice !== null && product.priceUsd < filters.minPrice) {
        return false;
      }

      if (filters.maxPrice !== null && product.priceUsd > filters.maxPrice) {
        return false;
      }

      if (!productPassesStockFilter(configuration, !product.outOfStock, filters.inStockOnly)) {
        return false;
      }

      if (!productMatchesAttributeFilters(configuration, filters.attributes)) {
        return false;
      }

      return true;
    });
  }

  private applyClientSort(products: readonly StoreProduct[]): readonly StoreProduct[] {
    const sort = this.sortState();
    const copy = [...products];

    switch (sort) {
      case 'alphabetical':
        return copy.sort((left, right) => left.title.localeCompare(right.title));
      case 'rating-desc':
        return copy.sort((left, right) => (right.rating ?? 0) - (left.rating ?? 0));
      case 'price-asc':
        return copy.sort((left, right) => left.priceUsd - right.priceUsd);
      case 'price-desc':
        return copy.sort((left, right) => right.priceUsd - left.priceUsd);
      case 'newest':
        return copy.sort((left, right) =>
          (right.createdOnUtc ?? '').localeCompare(left.createdOnUtc ?? ''),
        );
      case 'best-selling':
      case 'featured':
      default:
        return copy.sort((left, right) => (left.listIndex ?? 0) - (right.listIndex ?? 0));
    }
  }

  private isServerSort(sort: StoreSortOption['value']): boolean {
    return sort === 'newest' || sort === 'price-asc' || sort === 'price-desc';
  }

  private matchesSection(product: StoreProduct, section: string): boolean {
    const text = `${product.title} ${product.platformLabel}`.toLowerCase();

    switch (section) {
      case 'gift-cards':
        return text.includes('gift');
      case 'subscriptions':
        return text.includes('subscription') || text.includes('membership') || text.includes('plus');
      case 'deals':
        return Boolean(product.discountLabel);
      case 'games':
      default:
        return !text.includes('gift') && !text.includes('subscription') && !text.includes('membership');
    }
  }

  private mapSortToApi(sort: StoreSortOption['value']): ProductSortBy | undefined {
    switch (sort) {
      case 'price-asc':
        return 'PriceAsc';
      case 'price-desc':
        return 'PriceDesc';
      case 'newest':
        return 'Newest';
      default:
        return undefined;
    }
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      return error.message;
    }

    return fallback;
  }
}

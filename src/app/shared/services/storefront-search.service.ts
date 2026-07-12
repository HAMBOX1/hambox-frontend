import { inject, Injectable, signal } from '@angular/core';

import { CategoryApiService } from '../../features/catalog/services/category-api.service';
import { Products } from '../../features/products/services/products';
import { mapProductToStoreProduct } from '../../features/products/utils/storefront-product.mapper';

const RECENT_SEARCHES_KEY = 'hambox.recent-searches';
const MAX_RECENT = 6;
const SUGGESTION_PAGE_SIZE = 8;

export type StorefrontSearchSuggestionType = 'product' | 'category' | 'recent';

export interface StorefrontSearchSuggestion {
  readonly type: StorefrontSearchSuggestionType;
  readonly id: string;
  readonly label: string;
  readonly subtitle?: string;
  readonly route: string;
  readonly searchTerm?: string;
}

@Injectable({
  providedIn: 'root',
})
export class StorefrontSearchService {
  private readonly products = inject(Products);
  private readonly categoryApi = inject(CategoryApiService);

  private readonly recentSearchesState = signal<readonly string[]>(this.readRecentSearches());
  private categoryLabelsCache: readonly { id: string; label: string }[] | null = null;

  readonly recentSearches = this.recentSearchesState.asReadonly();

  async getSuggestions(term: string): Promise<readonly StorefrontSearchSuggestion[]> {
    const normalized = term.trim();
    if (!normalized) {
      return this.recentSearchesState().map((recent) => ({
        type: 'recent' as const,
        id: `recent-${recent}`,
        label: recent,
        route: '/products',
        searchTerm: recent,
      }));
    }

    const [productResult, categories] = await Promise.all([
      this.products.getActiveProducts({
        pageNumber: 1,
        pageSize: SUGGESTION_PAGE_SIZE,
        searchTerm: normalized,
      }),
      this.loadCategoryLabels(),
    ]);

    const lowered = normalized.toLowerCase();
    const productSuggestions: StorefrontSearchSuggestion[] = (productResult.items ?? [])
      .map((product, index) => mapProductToStoreProduct(product, index))
      .map((product) => ({
        type: 'product' as const,
        id: product.id,
        label: product.title,
        subtitle: product.platformLabel,
        route: `/products/${product.id}`,
      }));

    const categorySuggestions: StorefrontSearchSuggestion[] = categories
      .filter((category) => category.label.toLowerCase().includes(lowered))
      .slice(0, 4)
      .map((category) => ({
        type: 'category' as const,
        id: category.id,
        label: category.label,
        subtitle: 'Category',
        route: '/products',
        searchTerm: category.label,
      }));

    return [...productSuggestions, ...categorySuggestions];
  }

  rememberSearch(term: string): void {
    const normalized = term.trim();
    if (!normalized) {
      return;
    }

    const next = [normalized, ...this.recentSearchesState().filter((item) => item !== normalized)].slice(
      0,
      MAX_RECENT,
    );
    this.recentSearchesState.set(next);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  }

  clearRecentSearches(): void {
    this.recentSearchesState.set([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  }

  private readRecentSearches(): string[] {
    try {
      const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }

  private async loadCategoryLabels(): Promise<readonly { id: string; label: string }[]> {
    if (this.categoryLabelsCache) {
      return this.categoryLabelsCache;
    }

    const pills = await this.products.getCategoryPills();
    this.categoryLabelsCache = pills.filter((pill) => pill.id !== 'all');
    return this.categoryLabelsCache;
  }
}

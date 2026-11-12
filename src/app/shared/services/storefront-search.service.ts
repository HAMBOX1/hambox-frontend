import { inject, Injectable, signal } from '@angular/core';

import { CategoryApiService } from '../../features/catalog/services/category-api.service';
import { InventoryApiService } from '../../features/catalog/services/inventory-api.service';
import { StorefrontProductConfigurationDto } from '../../features/catalog/models/inventory-api.model';
import { firstValueFrom } from 'rxjs';
import { Products } from '../../features/products/services/products';
import { mapProductToStoreProduct } from '../../features/products/utils/storefront-product.mapper';
import { TranslationService } from '../../core/i18n/translation.service';
import { SupportedLanguageId } from '../../core/i18n/locale.model';

const RECENT_SEARCHES_KEY = 'hambox.recent-searches';
const MAX_RECENT = 6;
const SUGGESTION_PAGE_SIZE = 8;
/** At most this many matching variants are listed under one product, and this many in the whole dropdown. */
const MAX_VARIANTS_PER_PRODUCT = 3;
const MAX_VARIANT_SUGGESTIONS = 6;

export type StorefrontSearchSuggestionType = 'product' | 'variant' | 'category' | 'recent';

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
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly translation = inject(TranslationService);

  private readonly recentSearchesState = signal<readonly string[]>(this.readRecentSearches());
  private categoryLabelsCache: readonly { id: string; label: string }[] | null = null;
  private categoryLabelsCacheLang: SupportedLanguageId | null = null;

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
    const lang = this.translation.language();
    const mappedProducts = (productResult.items ?? []).map((product, index) => mapProductToStoreProduct(product, lang, index));
    const variantsByProduct = await this.matchingVariants(
      mappedProducts.map((product) => product.id),
      normalized,
    );

    // Each product is followed by the variants that matched the words typed, so searching "Essential" lists
    // "PlayStation Plus — Essential · 1 Month" itself and not only the product that contains it.
    let variantsLeft = MAX_VARIANT_SUGGESTIONS;
    const productSuggestions: StorefrontSearchSuggestion[] = mappedProducts.flatMap((product) => {
      const rows: StorefrontSearchSuggestion[] = [
        {
          type: 'product' as const,
          id: product.id,
          label: product.title,
          subtitle: product.platformLabel,
          route: `/products/${product.id}`,
        },
      ];
      for (const variant of variantsByProduct.get(product.id) ?? []) {
        if (variantsLeft <= 0) {
          break;
        }
        variantsLeft--;
        rows.push({
          type: 'variant' as const,
          id: `variant-${variant.id}`,
          label: `${product.title} — ${variant.label}`,
          subtitle: variant.isOutOfStock ? 'Out of stock' : product.platformLabel,
          route: `/products/${product.id}?variant=${variant.id}`,
        });
      }
      return rows;
    });

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

  /**
   * The variants of the given products that the typed words point at: a variant counts when one of its options (label,
   * value or group name) or its SKU contains a word, and every word is found somewhere in the product name or the variant.
   * One batched request covers all products; if it fails the dropdown simply shows the products alone.
   */
  private async matchingVariants(
    productIds: readonly string[],
    term: string,
  ): Promise<ReadonlyMap<string, readonly { id: string; label: string; isOutOfStock: boolean }[]>> {
    const result = new Map<string, readonly { id: string; label: string; isOutOfStock: boolean }[]>();
    if (productIds.length === 0) {
      return result;
    }

    let configurations: readonly StorefrontProductConfigurationDto[];
    try {
      configurations = await firstValueFrom(this.inventoryApi.getStorefrontConfigurations(productIds));
    } catch {
      return result;
    }

    const words = term
      .toLowerCase()
      .split(/[\s_-]+/)
      .filter((word) => /[\p{L}\p{N}]/u.test(word));
    if (words.length === 0) {
      return result;
    }

    for (const configuration of configurations) {
      const optionById = new Map(
        configuration.optionGroups.flatMap((group) =>
          group.options.map((option) => [option.id, { label: option.label, value: option.value, group: group.displayName }] as const),
        ),
      );

      const matches = configuration.variants
        .filter((variant) => variant.isCompleteCombination)
        .map((variant) => {
          const options = variant.optionIds.map((id) => optionById.get(id)).filter((option) => !!option);
          const label = options.map((option) => option.label).join(' · ');
          const variantText = [variant.sku, ...options.flatMap((option) => [option.label, option.value, option.group])].join(' ').toLowerCase();
          return { id: variant.id, label, variantText, isOutOfStock: variant.isOutOfStock };
        })
        // Only a variant whose own text contains at least one typed word is worth listing under its product.
        .filter((variant) => variant.label && words.some((word) => variant.variantText.includes(word)))
        // Best first: the ones that match the most typed words, and among those the ones that are in stock (a product can
        // have dozens of matching variants and only a few rows to show them in).
        .sort(
          (a, b) =>
            this.matchedWords(b.variantText, words) - this.matchedWords(a.variantText, words) ||
            Number(a.isOutOfStock) - Number(b.isOutOfStock),
        )
        .slice(0, MAX_VARIANTS_PER_PRODUCT)
        .map(({ id, label, isOutOfStock }) => ({ id, label, isOutOfStock }));

      if (matches.length > 0) {
        result.set(configuration.productId, matches);
      }
    }

    return result;
  }

  private matchedWords(text: string, words: readonly string[]): number {
    return words.filter((word) => text.includes(word)).length;
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
    const lang = this.translation.language();
    if (this.categoryLabelsCache && this.categoryLabelsCacheLang === lang) {
      return this.categoryLabelsCache;
    }

    const pills = await this.products.getCategoryPills();
    this.categoryLabelsCache = pills.filter((pill) => pill.id !== 'all');
    this.categoryLabelsCacheLang = lang;
    return this.categoryLabelsCache;
  }
}

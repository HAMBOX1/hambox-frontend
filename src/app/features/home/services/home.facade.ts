import { computed, inject, Injectable, signal } from '@angular/core';

import { ApiError } from '../../../core/models/api-error.model';
import { StorefrontContent } from '../models/storefront-content.model';
import {
  FlashDeal,
  StorefrontCategory,
  StorefrontFeaturedProduct,
  TrendingRankItem,
  TrendingValueItem,
  TrustFeature,
} from '../models/storefront-home';
import { Home } from './home';

@Injectable()
export class HomeFacade {
  private readonly home = inject(Home);

  private readonly loadingState = signal(true);
  private readonly errorState = signal<string | null>(null);
  private readonly contentState = signal<StorefrontContent | null>(null);
  private readonly categoriesState = signal<readonly StorefrontCategory[]>([]);
  private readonly featuredProductsState = signal<readonly FlashDeal[]>([]);
  private readonly featuredHighlightState = signal<StorefrontFeaturedProduct | null>(null);
  private readonly trendingRanksState = signal<readonly TrendingRankItem[]>([]);
  private readonly trendingValueState = signal<TrendingValueItem | null>(null);
  private readonly trustFeaturesState = signal<readonly TrustFeature[]>([]);

  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly content = this.contentState.asReadonly();
  readonly categories = this.categoriesState.asReadonly();
  readonly featuredProducts = this.featuredProductsState.asReadonly();
  readonly featuredHighlight = this.featuredHighlightState.asReadonly();
  readonly trendingRanks = this.trendingRanksState.asReadonly();
  readonly trendingValue = this.trendingValueState.asReadonly();
  readonly trustFeatures = this.trustFeaturesState.asReadonly();
  readonly flashCountdownSeconds = computed(
    () => this.contentState()?.flashDeals.countdownSeconds ?? 0,
  );

  readonly hasCategories = computed(() => this.categoriesState().length > 0);
  readonly hasFeaturedProducts = computed(() => this.featuredProductsState().length > 0);
  readonly hasTrending = computed(
    () =>
      this.featuredHighlightState() !== null ||
      this.trendingRanksState().length > 0 ||
      this.trendingValueState() !== null,
  );

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const data = await this.home.loadHomeData();

      this.contentState.set(data.content);
      this.categoriesState.set(data.categories);
      this.featuredProductsState.set(data.featuredProducts);
      this.featuredHighlightState.set(data.featuredHighlight);
      this.trendingRanksState.set(data.trendingRanks);
      this.trendingValueState.set(data.trendingValue);
      this.trustFeaturesState.set(data.trustFeatures);
    } catch (error) {
      this.contentState.set(null);
      this.categoriesState.set([]);
      this.featuredProductsState.set([]);
      this.featuredHighlightState.set(null);
      this.trendingRanksState.set([]);
      this.trendingValueState.set(null);
      this.trustFeaturesState.set([]);
      this.errorState.set(this.toErrorMessage(error, 'Failed to load the storefront home page.'));
    } finally {
      this.loadingState.set(false);
    }
  }

  retry(): Promise<void> {
    return this.load();
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      return error.message;
    }

    return fallback;
  }
}

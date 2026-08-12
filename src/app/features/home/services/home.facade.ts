import { computed, inject, Injectable, signal } from '@angular/core';

import { FaqPublicService } from '../../../core/faq/faq-public.service';
import { PublicFaqDto } from '../../../core/faq/faq-public.model';
import { ApiError } from '../../../core/models/api-error.model';
import { LandingPageSectionEntry } from '../models/landing-page-section.model';
import { pageHasFaqSection } from '../section-registry/section-variant-registry';
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
  private readonly faqService = inject(FaqPublicService);

  private readonly loadingState = signal(true);
  private readonly errorState = signal<string | null>(null);
  private readonly contentState = signal<StorefrontContent | null>(null);
  private readonly sectionsState = signal<readonly LandingPageSectionEntry[]>([]);
  private readonly categoriesState = signal<readonly StorefrontCategory[]>([]);
  private readonly featuredProductsState = signal<readonly FlashDeal[]>([]);
  private readonly featuredHighlightState = signal<StorefrontFeaturedProduct | null>(null);
  private readonly trendingRanksState = signal<readonly TrendingRankItem[]>([]);
  private readonly trendingValueState = signal<TrendingValueItem | null>(null);
  private readonly trustFeaturesState = signal<readonly TrustFeature[]>([]);
  private readonly faqsState = signal<readonly PublicFaqDto[]>([]);

  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly content = this.contentState.asReadonly();
  readonly sections = this.sectionsState.asReadonly();
  readonly categories = this.categoriesState.asReadonly();
  readonly featuredProducts = this.featuredProductsState.asReadonly();
  readonly featuredHighlight = this.featuredHighlightState.asReadonly();
  readonly trendingRanks = this.trendingRanksState.asReadonly();
  readonly trendingValue = this.trendingValueState.asReadonly();
  readonly trustFeatures = this.trustFeaturesState.asReadonly();
  readonly faqs = this.faqsState.asReadonly();
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
      // Skip the extra round trip entirely when the active homepage template has no FAQ section.
      const faqs = pageHasFaqSection(data.sections) ? await this.faqService.getPublished('Global') : [];

      this.contentState.set(data.content);
      this.sectionsState.set(data.sections);
      this.categoriesState.set(data.categories);
      this.featuredProductsState.set(data.featuredProducts);
      this.featuredHighlightState.set(data.featuredHighlight);
      this.trendingRanksState.set(data.trendingRanks);
      this.trendingValueState.set(data.trendingValue);
      this.trustFeaturesState.set(data.trustFeatures);
      this.faqsState.set(faqs);
    } catch (error) {
      this.contentState.set(null);
      this.sectionsState.set([]);
      this.categoriesState.set([]);
      this.featuredProductsState.set([]);
      this.featuredHighlightState.set(null);
      this.trendingRanksState.set([]);
      this.trendingValueState.set(null);
      this.trustFeaturesState.set([]);
      this.faqsState.set([]);
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

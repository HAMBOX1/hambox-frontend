import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CategoryApiService } from '../../catalog/services/category-api.service';
import { ProductApiService } from '../../catalog/services/product-api.service';
import { Product } from '../../catalog/models/product.model';
import { LandingPageSectionEntry } from '../models/landing-page-section.model';
import { StorefrontContent } from '../models/storefront-content.model';
import {
  mapCategoryToStorefrontCategory,
  mapProductToFeaturedProduct,
  mapProductToFlashDeal,
  mapProductToTrendingRank,
  mapProductToTrendingValue,
  mapStorefrontContent,
  mapTrustItems,
} from '../utils/storefront-home.mapper';
import {
  FlashDeal,
  StorefrontCategory,
  StorefrontFeaturedProduct,
  TrendingRankItem,
  TrendingValueItem,
  TrustFeature,
} from '../models/storefront-home';
import { StorefrontApiService } from './storefront-api.service';
import { PageBuilderPublicApiService } from './page-builder-public-api.service';
import { TranslationService } from '../../../core/i18n/translation.service';

export interface StorefrontHomeData {
  readonly content: StorefrontContent;
  readonly sections: readonly LandingPageSectionEntry[];
  readonly categories: readonly StorefrontCategory[];
  readonly featuredProducts: readonly FlashDeal[];
  readonly newArrivals: readonly Product[];
  readonly featuredHighlight: StorefrontFeaturedProduct | null;
  readonly trendingRanks: readonly TrendingRankItem[];
  readonly trendingValue: TrendingValueItem | null;
  readonly trustFeatures: readonly TrustFeature[];
}

@Injectable({
  providedIn: 'root',
})
export class Home {
  private readonly storefrontApi = inject(StorefrontApiService);
  private readonly pageBuilderApi = inject(PageBuilderPublicApiService);
  private readonly categoryApi = inject(CategoryApiService);
  private readonly productApi = inject(ProductApiService);
  private readonly translation = inject(TranslationService);

  async loadHomeData(): Promise<StorefrontHomeData> {
    const lang = this.translation.language();
    const [contentResponse, publishedPage] = await Promise.all([
      firstValueFrom(this.storefrontApi.getContent()),
      firstValueFrom(this.pageBuilderApi.getPublishedSections()),
    ]);
    const content = mapStorefrontContent(contentResponse);

    const categoryLimit = content.popularCategories.maximumCategories || 8;
    const flashLimit = content.flashDeals.maximumProducts || 3;
    const collectionLimit = content.featuredCollections.maximumItems || 6;
    const flashSort = (['Newest', 'PriceAsc', 'PriceDesc'] as const).includes(
      content.flashDeals.sortMethod as 'Newest' | 'PriceAsc' | 'PriceDesc',
    )
      ? (content.flashDeals.sortMethod as 'Newest' | 'PriceAsc' | 'PriceDesc')
      : 'PriceDesc';

    const [categoriesResult, featuredResult, newArrivalsResult] = await Promise.all([
      content.popularCategories.visible
        ? firstValueFrom(
            this.categoryApi.getCategories({
              pageNumber: 1,
              pageSize: categoryLimit,
              activeOnly: true,
            }),
          )
        : Promise.resolve({ items: [] as never[] }),
      content.flashDeals.visible
        ? firstValueFrom(
            this.productApi.getProducts({
              pageNumber: 1,
              pageSize: flashLimit,
              status: 'Active',
              sortBy: flashSort,
            }),
          )
        : Promise.resolve({ items: [] as never[] }),
      content.featuredCollections.visible
        ? firstValueFrom(
            this.productApi.getProducts({
              pageNumber: 1,
              pageSize: collectionLimit,
              status: 'Active',
              sortBy: 'Newest',
            }),
          )
        : Promise.resolve({ items: [] as never[] }),
    ]);

    const categories = (categoriesResult.items ?? []).map((category) =>
      mapCategoryToStorefrontCategory(category, lang),
    );
    const featuredProducts = (featuredResult.items ?? []).map((product, index) =>
      mapProductToFlashDeal(product, lang, index),
    );
    const newArrivals = newArrivalsResult.items ?? [];

    let featuredHighlight: StorefrontFeaturedProduct | null = null;
    if (content.featuredProduct.visible) {
      const preferredId = content.featuredProduct.productId;
      const preferred =
        preferredId != null
          ? (featuredResult.items ?? []).find((p) => p.id === preferredId) ??
            newArrivals.find((p) => p.id === preferredId)
          : null;
      const source = preferred ?? featuredResult.items?.[0] ?? newArrivals[0] ?? null;
      featuredHighlight = source
        ? mapProductToFeaturedProduct(
            source,
            lang,
            0,
            content.featuredProduct.badge,
            content.featuredProduct.callToAction,
          )
        : null;
    }

    const trendingRankSources = newArrivals.slice(0, 2);
    const trendingValueSource = newArrivals[2] ?? newArrivals[0] ?? null;
    const trendingRanks = trendingRankSources.map((product, index) =>
      mapProductToTrendingRank(product, lang, index),
    );

    return {
      content,
      sections: publishedPage.sections,
      categories,
      featuredProducts,
      newArrivals,
      featuredHighlight,
      trendingRanks,
      trendingValue: trendingValueSource ? mapProductToTrendingValue(trendingValueSource, lang) : null,
      trustFeatures: mapTrustItems(content.trustBar),
    };
  }
}

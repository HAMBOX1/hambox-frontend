import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CategoryApiService } from '../../catalog/services/category-api.service';
import { ProductApiService } from '../../catalog/services/product-api.service';
import { Product } from '../../catalog/models/product.model';
import { StorefrontContent } from '../models/storefront-content.model';
import {
  mapCategoryToStorefrontCategory,
  mapProductToFeaturedProduct,
  mapProductToFlashDeal,
  mapProductToTrendingRank,
  mapProductToTrendingValue,
  mapStorefrontContent,
} from '../utils/storefront-home.mapper';
import {
  FlashDeal,
  StorefrontCategory,
  StorefrontFeaturedProduct,
  TrendingRankItem,
  TrendingValueItem,
} from '../models/storefront-home';
import { StorefrontApiService } from './storefront-api.service';

const HOME_CATEGORY_LIMIT = 8;
const FEATURED_PRODUCT_LIMIT = 3;
const NEW_ARRIVAL_LIMIT = 6;

export interface StorefrontHomeData {
  readonly content: StorefrontContent;
  readonly categories: readonly StorefrontCategory[];
  readonly featuredProducts: readonly FlashDeal[];
  readonly newArrivals: readonly Product[];
  readonly featuredHighlight: StorefrontFeaturedProduct | null;
  readonly trendingRanks: readonly TrendingRankItem[];
  readonly trendingValue: TrendingValueItem | null;
}

@Injectable({
  providedIn: 'root',
})
export class Home {
  private readonly storefrontApi = inject(StorefrontApiService);
  private readonly categoryApi = inject(CategoryApiService);
  private readonly productApi = inject(ProductApiService);

  async loadHomeData(): Promise<StorefrontHomeData> {
    const [contentResponse, categoriesResult, featuredResult, newArrivalsResult] = await Promise.all([
      firstValueFrom(this.storefrontApi.getContent()),
      firstValueFrom(
        this.categoryApi.getCategories({
          pageNumber: 1,
          pageSize: HOME_CATEGORY_LIMIT,
          activeOnly: true,
        }),
      ),
      firstValueFrom(
        this.productApi.getProducts({
          pageNumber: 1,
          pageSize: FEATURED_PRODUCT_LIMIT,
          status: 'Active',
          sortBy: 'PriceDesc',
        }),
      ),
      firstValueFrom(
        this.productApi.getProducts({
          pageNumber: 1,
          pageSize: NEW_ARRIVAL_LIMIT,
          status: 'Active',
          sortBy: 'Newest',
        }),
      ),
    ]);

    const content = mapStorefrontContent(contentResponse);
    const categories = (categoriesResult.items ?? []).map(mapCategoryToStorefrontCategory);
    const featuredProducts = (featuredResult.items ?? []).map((product, index) =>
      mapProductToFlashDeal(product, index),
    );
    const newArrivals = newArrivalsResult.items ?? [];

    const featuredHighlightSource = featuredResult.items?.[0] ?? newArrivals[0] ?? null;
    const trendingRankSources = newArrivals.slice(0, 2);
    const trendingValueSource = newArrivals[2] ?? newArrivals[0] ?? null;

    const trendingRanks = trendingRankSources.map((product, index) =>
      mapProductToTrendingRank(product, index),
    );

    return {
      content,
      categories,
      featuredProducts,
      newArrivals,
      featuredHighlight: featuredHighlightSource
        ? mapProductToFeaturedProduct(featuredHighlightSource)
        : null,
      trendingRanks,
      trendingValue: trendingValueSource ? mapProductToTrendingValue(trendingValueSource) : null,
    };
  }
}

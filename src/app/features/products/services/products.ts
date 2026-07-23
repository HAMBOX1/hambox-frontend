import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CategoryApiService } from '../../catalog/services/category-api.service';
import { ProductApiService } from '../../catalog/services/product-api.service';
import { Category } from '../../catalog/models/category.model';
import {
  Product,
  ProductFacetGroup,
  ProductListQuery,
  ProductSortBy,
} from '../../catalog/models/product.model';
import { PagedResult } from '../../catalog/models/category.model';
import { StoreCategoryPill } from '../models/product';
import { TranslationService } from '../../../core/i18n/translation.service';
import { resolveLocalizedText } from '../../../core/i18n/localized-text.util';

const CATEGORY_PAGE_SIZE = 100;

export interface StorefrontProductQuery {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchTerm?: string;
  readonly categoryId?: string;
  readonly sortBy?: ProductSortBy;
  readonly attributes?: Readonly<Record<string, readonly string[]>>;
}

export interface StorefrontFacetQuery {
  readonly searchTerm?: string;
  readonly categoryId?: string;
  readonly attributes?: Readonly<Record<string, readonly string[]>>;
}

@Injectable({
  providedIn: 'root',
})
export class Products {
  private readonly productApi = inject(ProductApiService);
  private readonly categoryApi = inject(CategoryApiService);
  private readonly translation = inject(TranslationService);

  getActiveProducts(query: StorefrontProductQuery): Promise<PagedResult<Product>> {
    const request: ProductListQuery = {
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      searchTerm: query.searchTerm,
      status: 'Active',
      categoryId: query.categoryId,
      sortBy: query.sortBy,
      attributes: query.attributes,
    };

    return firstValueFrom(this.productApi.getProducts(request));
  }

  getFacets(query: StorefrontFacetQuery): Promise<readonly ProductFacetGroup[]> {
    return firstValueFrom(this.productApi.getProductFacets(query));
  }

  getProductById(id: string): Promise<Product> {
    return firstValueFrom(this.productApi.getProductById(id));
  }

  getCategoryPills(): Promise<readonly StoreCategoryPill[]> {
    return firstValueFrom(
      this.categoryApi.getCategories({
        pageNumber: 1,
        pageSize: CATEGORY_PAGE_SIZE,
        activeOnly: true,
      }),
    ).then((result) => this.mapCategoryPills(result.items ?? []));
  }

  private mapCategoryPills(categories: readonly Category[]): readonly StoreCategoryPill[] {
    const lang = this.translation.language();
    return [
      { id: 'all', label: 'All Items' },
      ...categories.map((category) => ({
        id: category.id,
        label: resolveLocalizedText(category.nameEn, category.nameAr, lang),
      })),
    ];
  }
}

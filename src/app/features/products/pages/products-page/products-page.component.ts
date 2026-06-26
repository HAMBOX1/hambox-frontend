import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { StorefrontNavComponent } from '../../../../shared/components/storefront-nav/storefront-nav.component';
import { StorefrontFooterComponent } from '../../../../shared/components/storefront-footer/storefront-footer.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton/loading-skeleton.component';
import { StoreFiltersSidebarComponent } from '../../components/store-filters-sidebar/store-filters-sidebar.component';
import { StoreToolbarComponent } from '../../components/store-toolbar/store-toolbar.component';
import { StorePromoBannerComponent } from '../../components/store-promo-banner/store-promo-banner.component';
import { StoreProductCardComponent } from '../../components/store-product-card/store-product-card.component';
import { StoreLoadMoreComponent } from '../../components/store-load-more/store-load-more.component';
import {
  STOREFRONT_PLATFORM_FILTERS,
  STOREFRONT_PRODUCTS_NAV_LINKS,
  STOREFRONT_PROMO_BANNER,
} from '../../services/storefront-products-data';
import { ProductsFacade } from '../../services/products.facade';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [
    StorefrontNavComponent,
    StorefrontFooterComponent,
    EmptyStateComponent,
    LoadingSkeletonComponent,
    StoreFiltersSidebarComponent,
    StoreToolbarComponent,
    StorePromoBannerComponent,
    StoreProductCardComponent,
    StoreLoadMoreComponent,
  ],
  providers: [ProductsFacade],
  templateUrl: './products-page.component.html',
  styleUrl: './products-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsPageComponent {
  private readonly facade = inject(ProductsFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly navLinks = STOREFRONT_PRODUCTS_NAV_LINKS;
  protected readonly platformFilters = STOREFRONT_PLATFORM_FILTERS;
  protected readonly promoBanner = STOREFRONT_PROMO_BANNER;

  protected readonly products = this.facade.items;
  protected readonly categories = this.facade.categories;
  protected readonly sortOptions = this.facade.sortOptions;
  protected readonly loading = this.facade.loading;
  protected readonly loadingMore = this.facade.loadingMore;
  protected readonly error = this.facade.error;
  protected readonly isEmpty = this.facade.isEmpty;
  protected readonly hasMore = this.facade.hasMore;
  protected readonly selectedCategoryId = this.facade.selectedCategoryId;
  protected readonly selectedSort = this.facade.selectedSort;
  protected readonly searchTerm = this.facade.searchTerm;

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const searchTerm = params.get('q') ?? '';
      const categoryId = params.get('category') ?? 'all';

      void this.facade.initialize(searchTerm, categoryId);
    });
  }

  protected onCategoryChange(categoryId: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: this.searchTerm().trim() || null,
        category: categoryId === 'all' ? null : categoryId,
      },
      queryParamsHandling: 'merge',
    });
  }

  protected onSortChange(sort: string): void {
    this.facade.setSort(sort);
  }

  protected onLoadMore(): void {
    void this.facade.loadMore();
  }

  protected retryLoad(): void {
    void this.facade.retry();
  }
}

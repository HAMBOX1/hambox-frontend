import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';

import { Home } from '../../../home/services/home';
import { StorefrontNavComponent } from '../../../../shared/components/storefront-nav/storefront-nav.component';
import { StorefrontFooterComponent } from '../../../../shared/components/storefront-footer/storefront-footer.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton/loading-skeleton.component';
import { StoreFiltersSidebarComponent } from '../../components/store-filters-sidebar/store-filters-sidebar.component';
import { StoreToolbarComponent } from '../../components/store-toolbar/store-toolbar.component';
import { StoreCategoryNavComponent } from '../../components/store-category-nav/store-category-nav.component';
import { StoreFlashHeroComponent } from '../../components/store-flash-hero/store-flash-hero.component';
import { StoreProductCardComponent } from '../../components/store-product-card/store-product-card.component';
import { StoreProductListItemComponent } from '../../components/store-product-list-item/store-product-list-item.component';
import { StoreAppliedFiltersComponent } from '../../components/store-applied-filters/store-applied-filters.component';
import { StorefrontNavLinksService } from '../../../home/services/storefront-nav-links.service';
import { ProductsFacade, StorefrontClientFilters } from '../../services/products.facade';
import { StorefrontFilterPanelService } from '../../services/storefront-filter-panel.service';
import { StorefrontViewModeService } from '../../services/storefront-view-mode.service';
import { resolveNavSection } from '../../../../shared/utils/storefront-nav.utils';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [
    PaginatorModule,
    StorefrontNavComponent,
    StorefrontFooterComponent,
    EmptyStateComponent,
    LoadingSkeletonComponent,
    StoreFiltersSidebarComponent,
    StoreToolbarComponent,
    StoreCategoryNavComponent,
    StoreFlashHeroComponent,
    StoreProductCardComponent,
    StoreProductListItemComponent,
    StoreAppliedFiltersComponent,
  ],
  providers: [ProductsFacade],
  templateUrl: './products-page.component.html',
  styleUrl: './products-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsPageComponent implements OnInit {
  private readonly facade = inject(ProductsFacade);
  private readonly home = inject(Home);
  private readonly filterPanel = inject(StorefrontFilterPanelService);
  private readonly viewModeService = inject(StorefrontViewModeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private initialized = false;

  protected readonly navLinks = inject(StorefrontNavLinksService).links;

  protected readonly flashDealCount = signal(0);
  protected readonly flashDealsVisible = signal(false);
  protected readonly flashCountdownSeconds = signal(0);
  protected readonly flashSectionTitle = signal('Flash Deals');
  protected readonly flashSectionSubtitle = signal('');
  protected readonly flashCountdownEnabled = signal(true);

  protected readonly products = this.facade.displayItems;
  protected readonly categories = this.facade.categories;
  protected readonly sortOptions = this.facade.sortOptions;
  protected readonly dynamicFilterGroups = this.facade.dynamicFilterGroups;
  protected readonly appliedFilterChips = this.facade.appliedFilterChips;
  protected readonly activeFilterCount = this.facade.activeFilterCount;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;
  protected readonly isEmpty = this.facade.isEmpty;
  protected readonly totalCount = this.facade.totalCount;
  protected readonly pageNumber = this.facade.pageNumber;
  protected readonly pageSize = this.facade.pageSize;
  protected readonly selectedCategoryId = this.facade.selectedCategoryId;
  protected readonly selectedSort = this.facade.selectedSort;
  protected readonly searchTerm = this.facade.searchTerm;
  protected readonly hasActiveClientFilters = this.facade.hasActiveClientFilters;
  protected readonly clientFilters = this.facade.clientFilters;

  protected readonly filtersCollapsed = this.filterPanel.collapsed;
  protected readonly filtersMobileOpen = this.filterPanel.mobileDrawerOpen;
  protected readonly viewMode = this.viewModeService.mode;

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const searchTerm = params.get('q') ?? '';
      const categoryId = params.get('category') ?? 'all';
      const section = resolveNavSection(params);

      const previousSearch = this.facade.searchTerm();
      const previousCategory = this.facade.selectedCategoryId();
      const previousSection = this.facade.selectedSection();

      if (!this.initialized || searchTerm !== previousSearch || categoryId !== previousCategory) {
        this.initialized = true;
        void this.facade.initialize(searchTerm, categoryId, section);
        return;
      }

      if (section !== previousSection) {
        this.facade.setSection(section);
      }
    });
  }

  ngOnInit(): void {
    void this.loadFlashDeals();
  }

  protected onCategoryChange(categoryId: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: this.searchTerm().trim() || null,
        category: categoryId === 'all' ? null : categoryId,
        section: this.route.snapshot.queryParamMap.get('section'),
      },
      queryParamsHandling: 'merge',
    });
  }

  protected onSortChange(sort: string): void {
    this.facade.setSort(sort);
  }

  protected onFiltersChange(filters: StorefrontClientFilters): void {
    this.facade.setClientFilters(filters);
  }

  protected onFiltersReset(): void {
    this.facade.resetClientFilters();
  }

  protected onRemoveFilter(chipId: string): void {
    this.facade.removeAppliedFilter(chipId);
  }

  protected onToggleFiltersCollapse(): void {
    this.filterPanel.toggle();
  }

  protected onOpenMobileFilters(): void {
    this.filterPanel.openMobileDrawer();
  }

  protected onCloseMobileFilters(): void {
    this.filterPanel.closeMobileDrawer();
  }

  protected onPageChange(event: PaginatorState): void {
    const page = Math.floor((event.first ?? 0) / (event.rows ?? this.pageSize())) + 1;
    void this.facade.goToPage(page);
  }

  protected retryLoad(): void {
    void this.facade.retry();
  }

  private async loadFlashDeals(): Promise<void> {
    try {
      const data = await this.home.loadHomeData();
      this.flashDealCount.set(data.featuredProducts.length);
      this.flashDealsVisible.set(data.content.flashDeals.visible && data.featuredProducts.length > 0);
      this.flashCountdownSeconds.set(data.content.flashDeals.countdownSeconds);
      this.flashSectionTitle.set(data.content.flashDeals.sectionTitle);
      this.flashSectionSubtitle.set(data.content.flashDeals.sectionSubtitle);
      this.flashCountdownEnabled.set(data.content.flashDeals.countdownEnabled);
    } catch {
      this.flashDealsVisible.set(false);
    }
  }
}

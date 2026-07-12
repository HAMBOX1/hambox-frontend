import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton/loading-skeleton.component';
import { StorefrontNavComponent } from '../../../../shared/components/storefront-nav/storefront-nav.component';
import { StorefrontFooterComponent } from '../../../../shared/components/storefront-footer/storefront-footer.component';
import { AnnouncementBarComponent } from '../../components/announcement-bar/announcement-bar.component';
import { HeroSectionComponent } from '../../components/hero-section/hero-section.component';
import { PromoBannerComponent } from '../../components/promo-banner/promo-banner.component';
import { TrustBarComponent } from '../../components/trust-bar/trust-bar.component';
import { PopularCategoriesComponent } from '../../components/popular-categories/popular-categories.component';
import { FlashDealsSectionComponent } from '../../components/flash-deals-section/flash-deals-section.component';
import { TrendingSectionComponent } from '../../components/trending-section/trending-section.component';
import { STOREFRONT_NAV_LINKS } from '../../services/storefront-home-data';
import { HomeFacade } from '../../services/home.facade';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    StorefrontNavComponent,
    AnnouncementBarComponent,
    HeroSectionComponent,
    PromoBannerComponent,
    TrustBarComponent,
    PopularCategoriesComponent,
    FlashDealsSectionComponent,
    TrendingSectionComponent,
    StorefrontFooterComponent,
    EmptyStateComponent,
    LoadingSkeletonComponent,
  ],
  providers: [HomeFacade],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent implements OnInit {
  private readonly facade = inject(HomeFacade);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  protected readonly navLinks = STOREFRONT_NAV_LINKS;

  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;
  protected readonly content = this.facade.content;
  protected readonly categories = this.facade.categories;
  protected readonly featuredProducts = this.facade.featuredProducts;
  protected readonly featuredHighlight = this.facade.featuredHighlight;
  protected readonly trendingRanks = this.facade.trendingRanks;
  protected readonly trendingValue = this.facade.trendingValue;
  protected readonly trustFeatures = this.facade.trustFeatures;
  protected readonly flashCountdownSeconds = this.facade.flashCountdownSeconds;
  protected readonly hasCategories = this.facade.hasCategories;
  protected readonly hasFeaturedProducts = this.facade.hasFeaturedProducts;
  protected readonly hasTrending = this.facade.hasTrending;

  async ngOnInit(): Promise<void> {
    await this.facade.load();
    this.applySeo();
  }

  protected retryLoad(): void {
    void this.facade.retry().then(() => this.applySeo());
  }

  protected browseStore(): void {
    void this.router.navigate(['/products']);
  }

  private applySeo(): void {
    const seo = this.content()?.seo;
    if (!seo) {
      return;
    }

    this.title.setTitle(seo.defaultMetaTitle);
    this.meta.updateTag({ name: 'description', content: seo.defaultMetaDescription });
    this.meta.updateTag({ property: 'og:title', content: seo.defaultMetaTitle });
    this.meta.updateTag({ property: 'og:description', content: seo.defaultMetaDescription });
    if (seo.openGraphImageUrl) {
      this.meta.updateTag({ property: 'og:image', content: seo.openGraphImageUrl });
    }
    this.meta.updateTag({ name: 'twitter:card', content: seo.twitterCard });
    if (seo.canonicalUrl) {
      this.meta.updateTag({ rel: 'canonical', href: seo.canonicalUrl });
    }
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton/loading-skeleton.component';
import { StorefrontFooterComponent } from '../../../../shared/components/storefront-footer/storefront-footer.component';
import { StorefrontNavComponent } from '../../../../shared/components/storefront-nav/storefront-nav.component';
import { CategoryApiService } from '../../../catalog/services/category-api.service';
import { ProductApiService } from '../../../catalog/services/product-api.service';
import { PublishedLandingPageResponse } from '../../../home/models/landing-page-section.model';
import { Home } from '../../../home/services/home';
import { PageBuilderPublicApiService } from '../../../home/services/page-builder-public-api.service';
import { SectionRenderContext } from '../../../home/section-registry/models/section-variant.model';
import { SectionRendererComponent } from '../../../home/section-registry/render/section-renderer.component';
import { mapCategoryToStorefrontCategory } from '../../../home/utils/storefront-home.mapper';
import { mapProductToStoreProduct } from '../../utils/storefront-product.mapper';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { FaqPublicService } from '../../../../core/faq/faq-public.service';
import { PublicFaqDto } from '../../../../core/faq/faq-public.model';
import { pageHasFaqSection } from '../../../home/section-registry/section-variant-registry';
import { STOREFRONT_PRODUCTS_NAV_LINKS } from '../../services/storefront-products-data';

/**
 * Public entry point for a Category Marketing Page: `/categories/:slug` resolves the category by its
 * existing unique `Slug`, then checks for a published page-builder page scoped to it. If one is
 * published, renders it via `app-section-renderer` (same renderer the homepage/PDP marketing pages
 * use) and applies its SEO overrides. If not, redirects into the existing `/products?category=:id`
 * experience — unchanged, exactly as it works today.
 */
@Component({
  selector: 'app-category-landing-page',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    StorefrontNavComponent,
    StorefrontFooterComponent,
    LoadingSkeletonComponent,
    SectionRendererComponent,
  ],
  templateUrl: './category-landing-page.component.html',
  styleUrl: './category-landing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryLandingPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly categoryApi = inject(CategoryApiService);
  private readonly productApi = inject(ProductApiService);
  private readonly pageBuilderPublicApi = inject(PageBuilderPublicApiService);
  private readonly home = inject(Home);
  private readonly translation = inject(TranslationService);
  private readonly faqService = inject(FaqPublicService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  protected readonly navLinks = STOREFRONT_PRODUCTS_NAV_LINKS;
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);

  private readonly marketingPage = signal<PublishedLandingPageResponse | null>(null);
  protected readonly marketingContext = signal<SectionRenderContext | null>(null);
  protected readonly marketingSections = computed(() =>
    [...(this.marketingPage()?.sections ?? [])]
      .filter((section) => section.isVisible)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  );

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const slug = params.get('slug');
      void this.resolve(slug);
    });
  }

  private async resolve(slug: string | null): Promise<void> {
    if (!slug) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.notFound.set(false);

    let category;
    try {
      category = await firstValueFrom(this.categoryApi.getCategoryBySlug(slug));
    } catch {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    const page = await firstValueFrom(
      this.pageBuilderPublicApi.getPublishedForCategory(category.id),
    );
    if (!page) {
      // No marketing page — the existing category browsing experience, unchanged.
      void this.router.navigate(['/products'], {
        queryParams: { category: category.id },
        replaceUrl: true,
      });
      return;
    }

    this.marketingPage.set(page);

    const [home, productsPage, targetFaqs] = await Promise.all([
      this.home.loadHomeData(),
      firstValueFrom(
        this.productApi.getProducts({ pageNumber: 1, pageSize: 12, categoryId: category.id }),
      ),
      pageHasFaqSection(page.sections)
        ? this.faqService.getPublished('Category', category.id)
        : Promise.resolve<readonly PublicFaqDto[]>([]),
    ]);
    const lang = this.translation.language();

    this.marketingContext.set({
      content: home.content,
      categories: home.categories,
      featuredProducts: home.featuredProducts,
      featuredHighlight: home.featuredHighlight,
      trendingRanks: home.trendingRanks,
      trendingValue: home.trendingValue,
      trustFeatures: home.trustFeatures,
      flashCountdownSeconds: home.content.flashDeals.countdownSeconds ?? 0,
      targetFaqs,
      targetCategory: mapCategoryToStorefrontCategory(category, lang),
      targetCategoryProducts: productsPage.items.map((product, index) =>
        mapProductToStoreProduct(product, lang, index),
      ),
    });

    this.applySeo(
      page,
      mapCategoryToStorefrontCategory(category, lang).title,
      category.imageUrl ?? '',
    );
    this.loading.set(false);
  }

  private applySeo(
    page: PublishedLandingPageResponse,
    fallbackTitle: string,
    fallbackImage: string,
  ): void {
    const seoTitle = page.seoTitle || fallbackTitle;
    const seoDescription = page.seoDescription || '';
    const seoImage = page.seoOgImageUrl || fallbackImage;

    this.title.setTitle(seoTitle);
    if (seoDescription) {
      this.meta.updateTag({ name: 'description', content: seoDescription });
    }
    this.meta.updateTag({ property: 'og:title', content: seoTitle });
    if (seoImage) {
      this.meta.updateTag({ property: 'og:image', content: seoImage });
    }
    this.updateCanonicalLink(window.location.href);
  }

  private updateCanonicalLink(url: string): void {
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}

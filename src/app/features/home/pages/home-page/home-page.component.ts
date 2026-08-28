import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton/loading-skeleton.component';
import { StorefrontNavComponent } from '../../../../shared/components/storefront-nav/storefront-nav.component';
import { StorefrontFooterComponent } from '../../../../shared/components/storefront-footer/storefront-footer.component';
import { SectionRendererComponent } from '../../section-registry/render/section-renderer.component';
import { SectionRenderContext } from '../../section-registry/models/section-variant.model';
import { STOREFRONT_NAV_LINKS } from '../../services/storefront-home-data';
import { HomeFacade } from '../../services/home.facade';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    StorefrontNavComponent,
    SectionRendererComponent,
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
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  protected readonly navLinks = STOREFRONT_NAV_LINKS;

  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;
  protected readonly content = this.facade.content;

  // The bottom `<app-storefront-footer>` (kept as-is below) already renders the Footer section,
  // so it's excluded here to avoid rendering it twice via the registry loop.
  protected readonly sections = computed(() => this.facade.sections().filter((s) => s.category !== 'Footer'));

  protected readonly renderContext = computed<SectionRenderContext | null>(() => {
    const content = this.content();
    if (!content) {
      return null;
    }

    return {
      content,
      categories: this.facade.categories(),
      featuredProducts: this.facade.featuredProducts(),
      featuredHighlight: this.facade.featuredHighlight(),
      trendingRanks: this.facade.trendingRanks(),
      trendingValue: this.facade.trendingValue(),
      trustFeatures: this.facade.trustFeatures(),
      flashCountdownSeconds: this.facade.flashCountdownSeconds(),
      targetFaqs: this.facade.faqs(),
    };
  });

  async ngOnInit(): Promise<void> {
    await this.facade.load();
    this.applySeo();
  }

  protected retryLoad(): void {
    void this.facade.retry().then(() => this.applySeo());
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

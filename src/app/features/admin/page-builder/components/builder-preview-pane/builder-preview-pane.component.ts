import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../../../core/models/api-error.model';
import { TranslationService } from '../../../../../core/i18n/translation.service';
import {
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
} from '../../../../../shared/components/admin';
import { CategoryApiService } from '../../../../catalog/services/category-api.service';
import { ProductApiService } from '../../../../catalog/services/product-api.service';
import { LandingPageScope } from '../../../../home/models/landing-page-section.model';
import { Home } from '../../../../home/services/home';
import { SectionRenderContext } from '../../../../home/section-registry/models/section-variant.model';
import { SectionRendererComponent } from '../../../../home/section-registry/render/section-renderer.component';
import {
  mapCategoryToStorefrontCategory,
  mapProductToFeaturedProduct,
} from '../../../../home/utils/storefront-home.mapper';
import { mapProductToStoreProduct } from '../../../../products/utils/storefront-product.mapper';
import { LandingPageSectionEntry } from '../../models/page-builder.model';
import { PreviewDevice } from '../device-preview-toggle/device-preview-toggle.component';

export interface PreviewTarget {
  readonly scope: LandingPageScope;
  readonly targetId: string;
}

/**
 * Live preview of the draft landing page: renders the same real storefront category/product/
 * trending/trust data (via the `Home` service, root-provided — shared with the actual storefront
 * home page, not duplicated here) through `app-section-renderer`, the same renderer the storefront
 * home page uses. Data is fetched once on init; the preview is read-only and not reactive to the
 * live storefront, only to local draft edits (`sections` input).
 *
 * When `target` is set (editing a Product/Category marketing page), the real target entity is fetched
 * too and merged into the context as `targetProduct`/`targetCategory`/`targetCategoryProducts` — the
 * base homepage-shaped feeds (categories/trending/trust/…) are still loaded alongside it, since
 * non-context-aware sections (Features, Promotions, Editorial, …) still render from them.
 */
@Component({
  selector: 'app-builder-preview-pane',
  standalone: true,
  imports: [
    TranslatePipe,
    AdminEmptyStateComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    SectionRendererComponent,
  ],
  templateUrl: './builder-preview-pane.component.html',
  styleUrl: './builder-preview-pane.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuilderPreviewPaneComponent implements OnInit {
  private readonly home = inject(Home);
  private readonly productApi = inject(ProductApiService);
  private readonly categoryApi = inject(CategoryApiService);
  private readonly translation = inject(TranslationService);

  readonly sections = input.required<readonly LandingPageSectionEntry[]>();
  readonly device = input<PreviewDevice>('desktop');
  readonly target = input<PreviewTarget | null>(null);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly context = signal<SectionRenderContext | null>(null);

  protected readonly visibleSections = computed(() =>
    [...this.sections()]
      .filter((section) => section.isVisible)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  );

  ngOnInit(): void {
    void this.load();
  }

  protected retry(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const data = await this.home.loadHomeData();
      const context: SectionRenderContext = {
        content: data.content,
        categories: data.categories,
        featuredProducts: data.featuredProducts,
        featuredHighlight: data.featuredHighlight,
        trendingRanks: data.trendingRanks,
        trendingValue: data.trendingValue,
        trustFeatures: data.trustFeatures,
        flashCountdownSeconds: data.content.flashDeals.countdownSeconds ?? 0,
        ...(await this.loadTargetContext()),
      };
      this.context.set(context);
    } catch (error) {
      this.context.set(null);
      this.error.set(error instanceof ApiError ? error.message : 'Failed to load preview data.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadTargetContext(): Promise<Partial<SectionRenderContext>> {
    const target = this.target();
    if (!target) {
      return {};
    }

    const lang = this.translation.language();

    if (target.scope === 'Product') {
      const product = await firstValueFrom(this.productApi.getProductById(target.targetId));
      return { targetProduct: mapProductToFeaturedProduct(product, lang) };
    }

    if (target.scope === 'Category') {
      const [category, productsPage] = await Promise.all([
        firstValueFrom(this.categoryApi.getCategoryById(target.targetId)),
        firstValueFrom(
          this.productApi.getProducts({ pageNumber: 1, pageSize: 12, categoryId: target.targetId }),
        ),
      ]);
      return {
        targetCategory: mapCategoryToStorefrontCategory(category, lang),
        targetCategoryProducts: productsPage.items.map((product, index) =>
          mapProductToStoreProduct(product, lang, index),
        ),
      };
    }

    return {};
  }
}

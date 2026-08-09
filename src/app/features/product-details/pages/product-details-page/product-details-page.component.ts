import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';

import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { StorefrontNavComponent } from '../../../../shared/components/storefront-nav/storefront-nav.component';
import { StorefrontFooterComponent } from '../../../../shared/components/storefront-footer/storefront-footer.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton/loading-skeleton.component';
import { STOREFRONT_PRODUCTS_NAV_LINKS } from '../../../products/services/storefront-products-data';
import { ProductDetailsItem } from '../../models/product-details';
import { ProductDetails } from '../../services/product-details';
import { StorefrontVariantFacade } from '../../services/storefront-variant.facade';
import { VariantOptionGroupComponent } from '../../components/variant-option-group/variant-option-group.component';
import { ApiError } from '../../../../core/models/api-error.model';
import { CartFacade } from '../../../cart/services/cart.facade';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { AUTH_CONTEXT } from '../../../../core/auth/auth-context';
import { AdminAuth } from '../../../auth/services/admin-auth';
import { AccountWishlistFacade } from '../../../account/services/account-wishlist.facade';
import { Products } from '../../../products/services/products';
import { StoreProduct } from '../../../products/models/product';
import { ProductMarketingPageAvailabilityService } from '../../../products/services/product-marketing-page-availability.service';
import { mapProductToStoreProduct } from '../../../products/utils/storefront-product.mapper';
import { StoreProductCardComponent } from '../../../products/components/store-product-card/store-product-card.component';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { PublishedLandingPageResponse } from '../../../home/models/landing-page-section.model';
import { Home } from '../../../home/services/home';
import { PageBuilderPublicApiService } from '../../../home/services/page-builder-public-api.service';
import { SectionRenderContext } from '../../../home/section-registry/models/section-variant.model';
import { SectionRendererComponent } from '../../../home/section-registry/render/section-renderer.component';

/** Approximate rendered height of `.pdp__mobile-bar` (10px+10px padding + 44px button + border) with
 * a little breathing room — ponytail: a measured constant, not a live `ResizeObserver`, is enough
 * since the bar's own CSS is fixed-height; revisit if that padding/button sizing ever changes. */
const BUY_BAR_INSET_PX = 76;

@Component({
  selector: 'app-product-details-page',
  standalone: true,
  imports: [
    RouterLink,
    NgTemplateOutlet,
    StorefrontNavComponent,
    StorefrontFooterComponent,
    VariantOptionGroupComponent,
    EmptyStateComponent,
    LoadingSkeletonComponent,
    HamboxCurrencyPipe,
    DatePipe,
    TranslatePipe,
    StoreProductCardComponent,
    SectionRendererComponent,
  ],
  templateUrl: './product-details-page.component.html',
  styleUrl: './product-details-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly productDetailsService = inject(ProductDetails);
  protected readonly variantFacade = inject(StorefrontVariantFacade);
  private readonly cartFacade = inject(CartFacade);
  private readonly authSession = inject(AuthSessionService);
  private readonly adminAuth = inject(AdminAuth);
  private readonly wishlistFacade = inject(AccountWishlistFacade);
  private readonly translate = inject(TranslateService);
  private readonly messageService = inject(MessageService);
  private readonly products = inject(Products);
  private readonly marketingAvailability = inject(ProductMarketingPageAvailabilityService);
  private readonly translation = inject(TranslationService);
  private readonly pageBuilderPublicApi = inject(PageBuilderPublicApiService);
  private readonly home = inject(Home);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  protected readonly navLinks = STOREFRONT_PRODUCTS_NAV_LINKS;
  protected readonly product = signal<ProductDetailsItem | null>(null);
  protected readonly selectedImageIndex = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly cartActionError = signal<string | null>(null);
  protected readonly wishlistActionMessage = signal<string | null>(null);
  protected readonly isAuthenticated = this.authSession.isAuthenticated;
  protected readonly isPreview = signal(false);
  protected readonly relatedProducts = signal<readonly StoreProduct[]>([]);

  private readonly marketingPage = signal<PublishedLandingPageResponse | null>(null);
  protected readonly marketingContext = signal<SectionRenderContext | null>(null);
  protected readonly marketingSections = computed(() =>
    [...(this.marketingPage()?.sections ?? [])]
      .filter((section) => section.isVisible)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  );

  protected readonly configuration = this.variantFacade.configuration;
  protected readonly resolvedVariant = this.variantFacade.resolved;
  protected readonly hasVariants = this.variantFacade.hasVariants;
  protected readonly variantConfigLoading = this.variantFacade.loading;
  protected readonly variantConfigError = this.variantFacade.error;
  protected readonly cartItems = this.cartFacade.items;

  protected readonly quantityInCart = computed(() => {
    const product = this.product();
    if (!product) {
      return 0;
    }

    const variantId = this.hasVariants() ? (this.resolvedVariant().variant?.id ?? null) : null;
    const line = this.cartItems().find(
      (item) =>
        item.productId === product.id && (item.productVariantId ?? null) === (variantId ?? null),
    );

    return line?.quantity ?? 0;
  });

  protected readonly remainingStock = computed(() => {
    if (!this.hasVariants()) {
      return Number.MAX_SAFE_INTEGER;
    }

    const resolved = this.resolvedVariant();
    if (!resolved.variant) {
      return 0;
    }

    return Math.max(0, resolved.availableStock - this.quantityInCart());
  });

  protected readonly displayPrice = computed(() => {
    if (this.hasVariants()) {
      return this.resolvedVariant().price;
    }

    return this.product()?.priceUsd ?? 0;
  });

  protected readonly displayComparePrice = computed(() => {
    if (this.hasVariants()) {
      return this.resolvedVariant().comparePrice ?? 0;
    }

    return this.product()?.originalPriceUsd ?? 0;
  });

  protected readonly stockLabel = computed(() => {
    if (!this.hasVariants()) {
      return { key: 'PRODUCT.STOCK_AVAILABLE', params: {}, isOutOfStock: false };
    }

    const resolved = this.resolvedVariant();
    if (!resolved.variant) {
      return { key: 'PRODUCT.STOCK_SELECT_OPTIONS', params: {}, isOutOfStock: false };
    }

    const inCart = this.quantityInCart();
    const remaining = this.remainingStock();

    if (resolved.isOutOfStock || remaining <= 0) {
      if (inCart > 0 && resolved.availableStock > 0) {
        return {
          key: 'PRODUCT.STOCK_ALL_IN_CART',
          params: { count: resolved.availableStock },
          isOutOfStock: false,
        };
      }

      return { key: 'PRODUCT.OUT_OF_STOCK', params: {}, isOutOfStock: true };
    }

    if (resolved.isLowStock || remaining <= 3) {
      if (inCart > 0) {
        return {
          key: 'PRODUCT.STOCK_LOW_WITH_CART',
          params: { remaining, inCart },
          isOutOfStock: false,
        };
      }

      return {
        key: 'PRODUCT.STOCK_LOW_COUNT',
        params: { count: resolved.availableStock },
        isOutOfStock: false,
      };
    }

    if (inCart > 0) {
      return {
        key: 'PRODUCT.STOCK_IN_WITH_CART',
        params: { remaining, inCart },
        isOutOfStock: false,
      };
    }

    return {
      key: 'PRODUCT.STOCK_IN_COUNT',
      params: { count: resolved.availableStock },
      isOutOfStock: false,
    };
  });

  protected readonly canPurchase = computed(() => {
    if (this.isPreview()) {
      return false;
    }

    if (this.product()?.canPurchase === false) {
      return false;
    }

    if (!this.hasVariants()) {
      return true;
    }

    const resolved = this.resolvedVariant();
    return resolved.variant !== null && !resolved.isOutOfStock && this.remainingStock() > 0;
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const productId = params.get('id');
      this.isPreview.set(this.route.snapshot.queryParamMap.get('preview') === '1');
      void this.loadProduct(productId);
    });

    // The buy bar is now persistent (desktop + mobile), so any other fixed-bottom UI — the AI
    // assistant widget in particular — needs to know to lift itself clear rather than render
    // underneath it. `--hambox-buy-bar-inset` mirrors the existing `--hambox-mobile-bottom-inset`
    // pattern (see `MobileViewportService`): a body-level custom property other components read.
    effect(() => {
      const barVisible = this.product() !== null && !this.loading() && !this.error();
      document.body.style.setProperty(
        '--hambox-buy-bar-inset',
        barVisible ? `${BUY_BAR_INSET_PX}px` : '0px',
      );
    });
    this.destroyRef.onDestroy(() => document.body.style.removeProperty('--hambox-buy-bar-inset'));
  }

  protected readonly cartIconSrc = 'assets/images/top-nav/cart-icon.svg';

  protected async addToCart(): Promise<void> {
    const current = this.product();
    if (!current || !this.canPurchase()) {
      return;
    }

    this.cartActionError.set(null);

    try {
      const variantId = this.hasVariants() ? (this.resolvedVariant().variant?.id ?? null) : null;
      if (this.hasVariants() && !variantId) {
        this.cartActionError.set('Select a valid variant before adding to cart.');
        return;
      }

      await this.cartFacade.addItem(current.id, 1, variantId);
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('CART.ADDED'),
        detail: current.title,
        life: 3000,
      });
    } catch (error) {
      const message = this.toCartErrorMessage(error);
      this.cartActionError.set(message);
      this.messageService.add({ severity: 'error', summary: message, life: 4000 });
    }
  }

  protected buyNow(): void {
    void this.addToCart().then(() => {
      void this.router.navigate(['/checkout']);
    });
  }

  protected async addToWishlist(): Promise<void> {
    const current = this.product();
    if (!current || this.isPreview()) {
      return;
    }

    if (!this.isAuthenticated()) {
      void this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: `/products/${current.id}` },
      });
      return;
    }

    this.wishlistActionMessage.set(null);
    const added = await this.wishlistFacade.add(current.id);
    const message = added
      ? this.translate.instant('PRODUCT.WISHLIST_ADDED')
      : this.translate.instant('PRODUCT.WISHLIST_ERROR');
    this.wishlistActionMessage.set(message);
    this.messageService.add({
      severity: added ? 'success' : 'error',
      summary: message,
      life: 3000,
    });
  }

  protected backToStore(): void {
    void this.router.navigate(['/products']);
  }

  protected selectGalleryImage(index: number): void {
    this.selectedImageIndex.set(index);
  }

  protected activeGalleryImage(): string {
    const current = this.product();
    if (!current) {
      return '';
    }

    return current.galleryImages[this.selectedImageIndex()] ?? current.imageUrl;
  }

  protected onOptionChange(groupId: string, optionId: string): void {
    this.variantFacade.setGroupSelection(groupId, optionId);
  }

  private toCartErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }

    return 'Unable to add this product to your cart.';
  }

  private async loadProduct(productId: string | null): Promise<void> {
    if (!productId) {
      this.product.set(null);
      this.error.set('Product not found.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.variantFacade.reset();

    const preview = this.isPreview();
    // Marketing content only renders when explicitly requested (product-card "discover" icon) —
    // a plain product/image/title click always lands on the classic PDP, even when a marketing
    // page is published. Skipping the fetch entirely here also avoids a wasted API call on every
    // ordinary PDP visit.
    const marketingRequested = this.route.snapshot.queryParamMap.get('view') === 'marketing';
    if (preview) {
      // This storefront route never runs the admin route guard, so the admin session (needed to
      // authorize the permission-gated preview/configuration call) is never hydrated from storage
      // in this tab unless we do it explicitly here.
      if (!this.authSession.initialized(AUTH_CONTEXT.Admin)) {
        await this.adminAuth.restoreSession();
        this.authSession.markInitialized(AUTH_CONTEXT.Admin);
      }
    }

    try {
      const [details, marketingPage] = await Promise.all([
        this.productDetailsService.getById(productId, preview),
        marketingRequested
          ? firstValueFrom(this.pageBuilderPublicApi.getPublishedForProduct(productId))
          : Promise.resolve(null),
        this.variantFacade.load(productId, preview),
        this.cartFacade.load(),
      ]);
      this.product.set(details);
      this.selectedImageIndex.set(0);
      this.relatedProducts.set([]);
      void this.loadRelatedProducts(details);
      await this.applyMarketingPage(marketingPage, details);
    } catch {
      this.product.set(null);
      this.error.set('Unable to load this product.');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * When a marketing page is published for this product, swaps the PDP over to rendering it (via
   * `app-section-renderer`, the same component the storefront homepage uses) and applies its SEO
   * overrides. When absent, resets both signals to null — the existing PDP renders exactly as
   * before, with no SEO tags touched, matching today's behavior precisely.
   */
  private async applyMarketingPage(
    page: PublishedLandingPageResponse | null,
    details: ProductDetailsItem,
  ): Promise<void> {
    if (!page) {
      this.marketingPage.set(null);
      this.marketingContext.set(null);
      return;
    }

    this.marketingPage.set(page);

    const home = await this.home.loadHomeData();
    this.marketingContext.set({
      content: home.content,
      categories: home.categories,
      featuredProducts: home.featuredProducts,
      featuredHighlight: home.featuredHighlight,
      trendingRanks: home.trendingRanks,
      trendingValue: home.trendingValue,
      trustFeatures: home.trustFeatures,
      flashCountdownSeconds: home.content.flashDeals.countdownSeconds ?? 0,
      targetProduct: {
        id: details.id,
        badge: '',
        title: details.title,
        description: details.description,
        imageUrl: details.imageUrl,
        ctaLabel: this.translate.instant('PRODUCT.BUY_NOW'),
        route: `/products/${details.id}`,
      },
    });

    this.applySeo(page, details.title, details.description, details.imageUrl);
  }

  private applySeo(
    page: PublishedLandingPageResponse,
    fallbackTitle: string,
    fallbackDescription: string,
    fallbackImage: string,
  ): void {
    const seoTitle = page.seoTitle || fallbackTitle;
    const seoDescription = page.seoDescription || fallbackDescription;
    const seoImage = page.seoOgImageUrl || fallbackImage;

    this.title.setTitle(seoTitle);
    this.meta.updateTag({ name: 'description', content: seoDescription });
    this.meta.updateTag({ property: 'og:title', content: seoTitle });
    this.meta.updateTag({ property: 'og:description', content: seoDescription });
    this.meta.updateTag({ property: 'og:image', content: seoImage });
    this.updateCanonicalLink(`${window.location.origin}/products/${this.product()?.id ?? ''}`);
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

  private async loadRelatedProducts(current: ProductDetailsItem): Promise<void> {
    if (!current.categoryId || this.isPreview()) {
      return;
    }

    try {
      const result = await this.products.getActiveProducts({
        pageNumber: 1,
        pageSize: 9,
        categoryId: current.categoryId,
      });

      const lang = this.translation.language();
      const related = result.items
        .filter((product) => product.id !== current.id)
        .slice(0, 8)
        .map((product, index) => mapProductToStoreProduct(product, lang, index));

      await this.marketingAvailability.ensureLoaded(related.map((product) => product.id));
      this.relatedProducts.set(
        related.map((product) => ({
          ...product,
          hasMarketingPage: this.marketingAvailability.hasMarketingPage(product.id),
        })),
      );
    } catch {
      this.relatedProducts.set([]);
    }
  }
}

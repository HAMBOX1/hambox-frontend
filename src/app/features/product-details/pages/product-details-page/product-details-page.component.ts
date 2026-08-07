import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';

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

@Component({
  selector: 'app-product-details-page',
  standalone: true,
  imports: [
    RouterLink,
    StorefrontNavComponent,
    StorefrontFooterComponent,
    VariantOptionGroupComponent,
    EmptyStateComponent,
    LoadingSkeletonComponent,
    HamboxCurrencyPipe,
    DatePipe,
    TranslatePipe,
  ],
  templateUrl: './product-details-page.component.html',
  styleUrl: './product-details-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productDetailsService = inject(ProductDetails);
  protected readonly variantFacade = inject(StorefrontVariantFacade);
  private readonly cartFacade = inject(CartFacade);
  private readonly authSession = inject(AuthSessionService);
  private readonly adminAuth = inject(AdminAuth);
  private readonly wishlistFacade = inject(AccountWishlistFacade);

  protected readonly navLinks = STOREFRONT_PRODUCTS_NAV_LINKS;
  protected readonly product = signal<ProductDetailsItem | null>(null);
  protected readonly selectedImageIndex = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly cartActionError = signal<string | null>(null);
  protected readonly wishlistActionMessage = signal<string | null>(null);
  protected readonly isAuthenticated = this.authSession.isAuthenticated;
  protected readonly isPreview = signal(false);

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

    const variantId = this.hasVariants() ? this.resolvedVariant().variant?.id ?? null : null;
    const line = this.cartItems().find(
      (item) =>
        item.productId === product.id &&
        (item.productVariantId ?? null) === (variantId ?? null),
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
      return 'Available';
    }

    const resolved = this.resolvedVariant();
    if (!resolved.variant) {
      return 'Select options';
    }

    if (resolved.isOutOfStock || this.remainingStock() <= 0) {
      if (this.quantityInCart() > 0 && resolved.availableStock > 0) {
        return `All ${resolved.availableStock} in your cart`;
      }

      return 'Out of Stock';
    }

    if (resolved.isLowStock || this.remainingStock() <= 3) {
      const inCart = this.quantityInCart();
      if (inCart > 0) {
        return `Low Stock (${this.remainingStock()} more available, ${inCart} in cart)`;
      }

      return `Low Stock (${resolved.availableStock} left)`;
    }

    const inCart = this.quantityInCart();
    if (inCart > 0) {
      return `In Stock (${this.remainingStock()} more available, ${inCart} in cart)`;
    }

    return `In Stock (${resolved.availableStock} available)`;
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
  }

  protected readonly cartIconSrc = 'assets/images/top-nav/cart-icon.svg';

  protected async addToCart(): Promise<void> {
    const current = this.product();
    if (!current || !this.canPurchase()) {
      return;
    }

    this.cartActionError.set(null);

    try {
      const variantId = this.hasVariants() ? this.resolvedVariant().variant?.id ?? null : null;
      if (this.hasVariants() && !variantId) {
        this.cartActionError.set('Select a valid variant before adding to cart.');
        return;
      }

      await this.cartFacade.addItem(current.id, 1, variantId);
    } catch (error) {
      this.cartActionError.set(this.toCartErrorMessage(error));
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
    this.wishlistActionMessage.set(
      added ? 'Saved to your vault.' : 'Unable to save this product to your vault.',
    );
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
      const [details] = await Promise.all([
        this.productDetailsService.getById(productId, preview),
        this.variantFacade.load(productId, preview),
        this.cartFacade.load(),
      ]);
      this.product.set(details);
      this.selectedImageIndex.set(0);
    } catch {
      this.product.set(null);
      this.error.set('Unable to load this product.');
    } finally {
      this.loading.set(false);
    }
  }
}

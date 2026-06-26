import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { StorefrontNavComponent } from '../../../../shared/components/storefront-nav/storefront-nav.component';
import { StorefrontFooterComponent } from '../../../../shared/components/storefront-footer/storefront-footer.component';
import { StorefrontFieldSelectComponent } from '../../../../shared/components/storefront-field-select/storefront-field-select.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton/loading-skeleton.component';
import { STOREFRONT_PRODUCTS_NAV_LINKS } from '../../../products/services/storefront-products-data';
import { ProductDetailsItem } from '../../models/product-details';
import { ProductDetails } from '../../services/product-details';
import { CartFacade } from '../../../cart/services/cart.facade';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { AccountWishlistFacade } from '../../../account/services/account-wishlist.facade';

@Component({
  selector: 'app-product-details-page',
  standalone: true,
  imports: [
    RouterLink,
    StorefrontNavComponent,
    StorefrontFooterComponent,
    StorefrontFieldSelectComponent,
    EmptyStateComponent,
    LoadingSkeletonComponent,
    HamboxCurrencyPipe,
  ],
  templateUrl: './product-details-page.component.html',
  styleUrl: './product-details-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productDetailsService = inject(ProductDetails);
  private readonly cartFacade = inject(CartFacade);
  private readonly authSession = inject(AuthSessionService);
  private readonly wishlistFacade = inject(AccountWishlistFacade);

  protected readonly navLinks = STOREFRONT_PRODUCTS_NAV_LINKS;
  protected readonly product = signal<ProductDetailsItem | null>(null);
  protected readonly selectedImageIndex = signal(0);
  protected readonly selectedRegion = signal('global');
  protected readonly selectedValue = signal('50');
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly cartActionError = signal<string | null>(null);
  protected readonly wishlistActionMessage = signal<string | null>(null);
  protected readonly isAuthenticated = this.authSession.isAuthenticated;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const productId = params.get('id');
      void this.loadProduct(productId);
    });
  }

  protected readonly cartIconSrc = 'assets/images/top-nav/cart-icon.svg';

  protected async addToCart(): Promise<void> {
    const current = this.product();
    if (!current) {
      return;
    }

    this.cartActionError.set(null);

    try {
      await this.cartFacade.addItem(current.id);
    } catch {
      this.cartActionError.set('Unable to add this product to your cart.');
    }
  }

  protected buyNow(): void {
    void this.addToCart().then(() => {
      void this.router.navigate(['/checkout']);
    });
  }

  protected async addToWishlist(): Promise<void> {
    const current = this.product();
    if (!current) {
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

  private async loadProduct(productId: string | null): Promise<void> {
    if (!productId) {
      this.product.set(null);
      this.error.set('Product not found.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const details = await this.productDetailsService.getById(productId);
      this.product.set(details);
      this.selectedImageIndex.set(0);
      this.selectedRegion.set(details.defaultRegion);
      this.selectedValue.set(details.defaultValue);
    } catch {
      this.product.set(null);
      this.error.set('Unable to load this product.');
    } finally {
      this.loading.set(false);
    }
  }
}

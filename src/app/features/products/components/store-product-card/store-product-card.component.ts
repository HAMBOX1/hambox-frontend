import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { StoreProduct } from '../../models/product';
import { CartFacade } from '../../../cart/services/cart.facade';
import { addStoreProductToCart } from '../../utils/storefront-add-to-cart.util';
import { StorefrontProductEnrichmentService } from '../../services/storefront-product-enrichment.service';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { AccountWishlistFacade } from '../../../account/services/account-wishlist.facade';

@Component({
  selector: 'app-store-product-card',
  standalone: true,
  imports: [RouterLink, TranslatePipe, HamboxCurrencyPipe],
  templateUrl: './store-product-card.component.html',
  styleUrl: './store-product-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreProductCardComponent {
  private readonly cartFacade = inject(CartFacade);
  private readonly router = inject(Router);
  private readonly enrichment = inject(StorefrontProductEnrichmentService);
  private readonly translate = inject(TranslateService);
  private readonly authSession = inject(AuthSessionService);
  private readonly wishlistFacade = inject(AccountWishlistFacade);

  product = input.required<StoreProduct>();
  compact = input(false);

  protected readonly cartIconSrc = 'assets/images/top-nav/cart-icon.svg';
  protected readonly addError = signal<string | null>(null);
  protected readonly wishlistAdded = signal(false);

  protected async toggleWishlist(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (this.wishlistAdded()) {
      return;
    }

    if (!this.authSession.isAuthenticated()) {
      void this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: `/products/${this.product().id}` },
      });
      return;
    }

    const added = await this.wishlistFacade.add(this.product().id);
    if (added) {
      this.wishlistAdded.set(true);
    }
  }

  protected stockLabelKey(product: StoreProduct): string {
    switch (product.stockStatus) {
      case 'in-stock':
        return 'PRODUCT.IN_STOCK';
      case 'low-stock':
        return 'PRODUCT.LOW_STOCK';
      case 'out-of-stock':
        return 'PRODUCT.OUT_OF_STOCK';
      default:
        return product.outOfStock ? 'PRODUCT.OUT_OF_STOCK' : 'PRODUCT.IN_STOCK';
    }
  }

  protected async addToCart(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (this.product().outOfStock || this.product().isMembersOnly || this.product().isComingSoon) {
      return;
    }

    this.addError.set(null);
    const product = this.product();
    const configuration = this.enrichment.getConfiguration(product.id);

    try {
      await addStoreProductToCart(
        this.cartFacade,
        this.router,
        product.id,
        configuration,
        product.requiresOptionSelection,
        product.directVariantId ?? null,
      );
    } catch {
      this.addError.set(this.translate.instant('CART.ADD_ERROR'));
    }
  }
}

import { HamboxCurrencyPipe } from '../../pipes/hambox-currency.pipe';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { FlashDeal } from '../../../features/home/models/storefront-home';
import { CartFacade } from '../../../features/cart/services/cart.facade';
import { StorefrontProductEnrichmentService } from '../../../features/products/services/storefront-product-enrichment.service';
import { addStoreProductToCart } from '../../../features/products/utils/storefront-add-to-cart.util';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { AccountWishlistFacade } from '../../../features/account/services/account-wishlist.facade';

@Component({
  selector: 'app-flash-deal-card',
  standalone: true,
  imports: [TagModule, RouterLink, HamboxCurrencyPipe, TranslatePipe],
  templateUrl: './flash-deal-card.component.html',
  styleUrl: './flash-deal-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlashDealCardComponent {
  private readonly cartFacade = inject(CartFacade);
  private readonly router = inject(Router);
  private readonly enrichment = inject(StorefrontProductEnrichmentService);
  private readonly translate = inject(TranslateService);
  private readonly messageService = inject(MessageService);
  private readonly authSession = inject(AuthSessionService);
  private readonly wishlistFacade = inject(AccountWishlistFacade);

  deal = input.required<FlashDeal>();
  /** Larger media + a real "Add to Cart" button instead of the compact "Buy Now" text link — used for
   * a single spotlighted card next to a grid of regular ones (e.g. the "Latest Arrivals" layout). */
  featured = input(false);

  protected readonly adding = signal(false);
  protected readonly wishlistAdded = signal(false);

  protected async toggleWishlist(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (this.wishlistAdded()) {
      return;
    }

    const deal = this.deal();

    if (!this.authSession.isAuthenticated()) {
      void this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: `/products/${deal.id}` },
      });
      return;
    }

    const added = await this.wishlistFacade.add(deal.id);
    if (added) {
      this.wishlistAdded.set(true);
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('PRODUCT.WISHLIST_ADDED'),
        life: 3000,
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('PRODUCT.WISHLIST_ERROR'),
        life: 4000,
      });
    }
  }

  protected async addToCart(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (this.adding()) {
      return;
    }

    this.adding.set(true);
    const deal = this.deal();
    const configuration = this.enrichment.getConfiguration(deal.id);

    try {
      const result = await addStoreProductToCart(this.cartFacade, this.router, deal.id, configuration);

      if (result === 'added') {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('CART.ADDED'),
          detail: deal.title,
          life: 3000,
        });
      }
    } catch {
      const message = this.translate.instant('CART.ADD_ERROR');
      this.messageService.add({ severity: 'error', summary: message, life: 4000 });
    } finally {
      this.adding.set(false);
    }
  }
}

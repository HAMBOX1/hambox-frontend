import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StorefrontNavComponent } from '../../../../shared/components/storefront-nav/storefront-nav.component';
import { StorefrontFooterComponent } from '../../../../shared/components/storefront-footer/storefront-footer.component';
import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton/loading-skeleton.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { CartLineItemComponent } from '../../components/cart-line-item/cart-line-item.component';
import { CartOrderSummaryComponent } from '../../components/cart-order-summary/cart-order-summary.component';
import { STOREFRONT_PRODUCTS_NAV_LINKS } from '../../../products/services/storefront-products-data';
import { CartFacade } from '../../services/cart.facade';

import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [
    RouterLink,
    StorefrontNavComponent,
    StorefrontFooterComponent,
    LoadingSkeletonComponent,
    EmptyStateComponent,
    CartLineItemComponent,
    CartOrderSummaryComponent,
    HamboxCurrencyPipe,
  ],
  templateUrl: './cart-page.component.html',
  styleUrl: './cart-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPageComponent implements OnInit {
  private readonly cartFacade = inject(CartFacade);

  protected readonly navLinks = signal([...STOREFRONT_PRODUCTS_NAV_LINKS]);
  protected readonly items = this.cartFacade.items;
  protected readonly summary = this.cartFacade.summary;
  protected readonly isEmpty = this.cartFacade.isEmpty;
  protected readonly loading = this.cartFacade.loading;
  protected readonly mutating = this.cartFacade.mutating;
  protected readonly error = this.cartFacade.error;

  ngOnInit(): void {
    void this.cartFacade.load();
  }

  protected retry(): void {
    void this.cartFacade.load();
  }

  protected removeItem(id: string): void {
    void this.cartFacade.removeItem(id);
  }

  protected incrementQuantity(id: string): void {
    void this.cartFacade.incrementQuantity(id);
  }

  protected decrementQuantity(id: string): void {
    void this.cartFacade.decrementQuantity(id);
  }
}

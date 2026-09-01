import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { StorefrontNavComponent } from '../../../../shared/components/storefront-nav/storefront-nav.component';
import { StorefrontFooterComponent } from '../../../../shared/components/storefront-footer/storefront-footer.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton/loading-skeleton.component';
import { StorefrontNavLinksService } from '../../../home/services/storefront-nav-links.service';
import { CartFacade } from '../../../cart/services/cart.facade';
import { CheckoutFacade } from '../../services/checkout.facade';
import { PaymentMethodSelectorComponent } from '../../components/payment-method-selector/payment-method-selector.component';
import { CheckoutBillingFormComponent } from '../../components/checkout-billing-form/checkout-billing-form.component';
import { CheckoutOrderSummaryComponent } from '../../components/checkout-order-summary/checkout-order-summary.component';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [
    StorefrontNavComponent,
    StorefrontFooterComponent,
    EmptyStateComponent,
    LoadingSkeletonComponent,
    PaymentMethodSelectorComponent,
    CheckoutBillingFormComponent,
    CheckoutOrderSummaryComponent,
  ],
  templateUrl: './checkout-page.component.html',
  styleUrl: './checkout-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutPageComponent implements OnInit {
  private readonly cartFacade = inject(CartFacade);
  private readonly checkoutFacade = inject(CheckoutFacade);
  private readonly router = inject(Router);

  protected readonly navLinks = inject(StorefrontNavLinksService).links;
  protected readonly loading = this.cartFacade.loading;
  protected readonly error = this.cartFacade.error;
  protected readonly isEmpty = this.cartFacade.isEmpty;

  ngOnInit(): void {
    this.checkoutFacade.clearStaleIdempotencyKeys();
    this.checkoutFacade.initialize();
    void this.initializeCheckout();
  }

  protected retry(): void {
    void this.initializeCheckout();
  }

  protected backToCart(): void {
    void this.router.navigate(['/cart']);
  }

  private async initializeCheckout(): Promise<void> {
    await this.cartFacade.load();

    if (this.cartFacade.isEmpty()) {
      return;
    }
  }
}

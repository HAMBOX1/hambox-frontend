import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { StorefrontNavComponent } from '../../../../shared/components/storefront-nav/storefront-nav.component';
import { StorefrontFooterComponent } from '../../../../shared/components/storefront-footer/storefront-footer.component';
import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton/loading-skeleton.component';
import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { PaymentMethodSelectorComponent } from '../../components/payment-method-selector/payment-method-selector.component';
import { CheckoutBillingFormComponent } from '../../components/checkout-billing-form/checkout-billing-form.component';
import { MembershipCheckoutFacade } from '../../services/membership-checkout.facade';
import { CheckoutFacade } from '../../services/checkout.facade';
import { STOREFRONT_PRODUCTS_NAV_LINKS } from '../../../products/services/storefront-products-data';

@Component({
  selector: 'app-membership-checkout-page',
  standalone: true,
  imports: [
    StorefrontNavComponent,
    StorefrontFooterComponent,
    LoadingSkeletonComponent,
    PaymentMethodSelectorComponent,
    CheckoutBillingFormComponent,
    HamboxCurrencyPipe,
    TranslatePipe,
    RouterLink,
  ],
  templateUrl: './membership-checkout-page.component.html',
  styleUrl: './membership-checkout-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembershipCheckoutPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly membershipCheckout = inject(MembershipCheckoutFacade);
  private readonly checkoutFacade = inject(CheckoutFacade);

  protected readonly preview = this.membershipCheckout.preview;
  protected readonly loading = this.membershipCheckout.loading;
  protected readonly error = this.membershipCheckout.error;
  protected readonly action = this.membershipCheckout.action;
  protected readonly discountCode = this.membershipCheckout.discountCode;
  protected readonly navLinks = signal([...STOREFRONT_PRODUCTS_NAV_LINKS]);

  ngOnInit(): void {
    const planId = this.route.snapshot.queryParamMap.get('planId');
    const action = this.route.snapshot.queryParamMap.get('action') ?? 'subscribe';
    if (!planId) {
      void this.router.navigate(['/account/membership']);
      return;
    }

    this.checkoutFacade.initialize();
    void this.membershipCheckout.initialize(planId, action);
  }

  protected setDiscountCode(event: Event): void {
    this.membershipCheckout.setDiscountCode((event.target as HTMLInputElement).value);
  }

  protected async applyCoupon(): Promise<void> {
    await this.membershipCheckout.applyDiscount();
  }

  protected proceedToPayment(): void {
    const billing = this.checkoutFacade.billingDetails();
    this.membershipCheckout.updateBillingField('email', billing.email);
    this.membershipCheckout.updateBillingField('country', billing.country);
    this.membershipCheckout.selectPaymentMethod(this.checkoutFacade.paymentMethod());

    void this.router.navigate(['/checkout/processing'], {
      queryParams: {
        mode: 'membership',
        planId: this.route.snapshot.queryParamMap.get('planId'),
        action: this.action(),
      },
    });
  }

  protected backToMembership(): void {
    void this.router.navigate(['/account/membership']);
  }
}

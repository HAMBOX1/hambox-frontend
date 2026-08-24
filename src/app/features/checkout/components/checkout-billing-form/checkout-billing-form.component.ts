import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CheckoutFacade } from '../../services/checkout.facade';
import { CHECKOUT_COUNTRIES } from '../../services/checkout.constants';
import { isDotFawryWallet } from '../../models/checkout';

@Component({
  selector: 'app-checkout-billing-form',
  standalone: true,
  templateUrl: './checkout-billing-form.component.html',
  styleUrl: './checkout-billing-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutBillingFormComponent {
  private readonly checkout = inject(CheckoutFacade);

  protected readonly billing = this.checkout.billingDetails;
  protected readonly countries = CHECKOUT_COUNTRIES;
  protected readonly paymentMethod = this.checkout.paymentMethod;
  protected readonly isDotFawryWallet = isDotFawryWallet;

  protected updateEmail(event: Event): void {
    this.checkout.updateBillingField('email', (event.target as HTMLInputElement).value);
  }

  protected updateCountry(event: Event): void {
    this.checkout.updateBillingField('country', (event.target as HTMLSelectElement).value);
  }

  protected updatePhoneNumber(event: Event): void {
    this.checkout.updateBillingField('phoneNumber', (event.target as HTMLInputElement).value);
  }

  protected updateCustomerName(event: Event): void {
    this.checkout.updateBillingField('customerName', (event.target as HTMLInputElement).value);
  }
}

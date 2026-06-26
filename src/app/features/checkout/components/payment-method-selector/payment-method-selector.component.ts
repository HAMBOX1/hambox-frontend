import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PaymentMethodId } from '../../models/checkout';
import { CHECKOUT_PAYMENT_METHODS } from '../../services/checkout.constants';
import { CheckoutFacade } from '../../services/checkout.facade';
import { CheckoutCardFormComponent } from '../checkout-card-form/checkout-card-form.component';

@Component({
  selector: 'app-payment-method-selector',
  standalone: true,
  imports: [CheckoutCardFormComponent],
  templateUrl: './payment-method-selector.component.html',
  styleUrl: './payment-method-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentMethodSelectorComponent {
  private readonly checkout = inject(CheckoutFacade);

  protected readonly methods = CHECKOUT_PAYMENT_METHODS;
  protected readonly selectedMethod = this.checkout.paymentMethod;

  protected selectMethod(method: PaymentMethodId): void {
    this.checkout.selectPaymentMethod(method);
  }

  protected isSelected(method: PaymentMethodId): boolean {
    return this.selectedMethod() === method;
  }
}

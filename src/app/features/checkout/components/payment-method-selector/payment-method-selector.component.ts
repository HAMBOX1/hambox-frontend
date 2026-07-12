import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PaymentMethodId } from '../../models/checkout';
import { CheckoutFacade } from '../../services/checkout.facade';
import { CheckoutCardFormComponent } from '../checkout-card-form/checkout-card-form.component';

const PAYMENT_LABELS: Record<PaymentMethodId, string> = {
  card: 'Card',
  paypal: 'PayPal',
  crypto: 'Crypto',
  'apple-pay': 'Apple Pay',
  development: 'Development',
};

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

  protected readonly selectedMethod = this.checkout.paymentMethod;
  protected readonly methods = computed(() =>
    this.checkout.availablePaymentMethods().map((id) => ({
      id,
      label: PAYMENT_LABELS[id],
    })),
  );

  protected selectMethod(method: PaymentMethodId): void {
    this.checkout.selectPaymentMethod(method);
  }

  protected isSelected(method: PaymentMethodId): boolean {
    return this.selectedMethod() === method;
  }
}

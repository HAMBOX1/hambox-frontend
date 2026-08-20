import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PaymentMethodId } from '../../models/checkout';
import { CheckoutFacade } from '../../services/checkout.facade';
import { CheckoutCardFormComponent } from '../checkout-card-form/checkout-card-form.component';

const PAYMENT_LABELS: Record<PaymentMethodId, string> = {
  card: 'CHECKOUT.METHOD_CARD',
  paypal: 'CHECKOUT.METHOD_PAYPAL',
  crypto: 'CHECKOUT.METHOD_CRYPTO',
  'apple-pay': 'CHECKOUT.METHOD_APPLE_PAY',
  development: 'CHECKOUT.METHOD_DEVELOPMENT',
  dot: 'CHECKOUT.METHOD_DOT',
  'dot-fawry': 'CHECKOUT.METHOD_DOT_FAWRY',
};

@Component({
  selector: 'app-payment-method-selector',
  standalone: true,
  imports: [CheckoutCardFormComponent, TranslatePipe],
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

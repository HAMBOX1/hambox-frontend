import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CheckoutFacade } from '../../services/checkout.facade';

@Component({
  selector: 'app-checkout-card-form',
  standalone: true,
  templateUrl: './checkout-card-form.component.html',
  styleUrl: './checkout-card-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutCardFormComponent {
  private readonly checkout = inject(CheckoutFacade);

  protected readonly cardDetails = this.checkout.cardDetails;

  protected updateField(
    field: 'cardholderName' | 'cardNumber' | 'expiryDate' | 'cvc',
    event: Event,
  ): void {
    this.checkout.updateCardField(field, (event.target as HTMLInputElement).value);
  }
}

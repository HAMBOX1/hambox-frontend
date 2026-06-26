import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { CartSummary } from '../../models/cart';

@Component({
  selector: 'app-cart-order-summary',
  standalone: true,
  imports: [RouterLink, HamboxCurrencyPipe],
  templateUrl: './cart-order-summary.component.html',
  styleUrl: './cart-order-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartOrderSummaryComponent {
  summary = input.required<CartSummary>();

  protected readonly promoCode = signal('');

  protected onPromoInput(event: Event): void {
    this.promoCode.set((event.target as HTMLInputElement).value);
  }

  protected applyPromo(): void {
    // Promo validation will be wired when checkout API is available.
  }
}

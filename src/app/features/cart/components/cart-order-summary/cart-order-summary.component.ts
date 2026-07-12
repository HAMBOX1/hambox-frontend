import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { CartSummary } from '../../models/cart';
import { CartFacade } from '../../services/cart.facade';

@Component({
  selector: 'app-cart-order-summary',
  standalone: true,
  imports: [RouterLink, HamboxCurrencyPipe],
  templateUrl: './cart-order-summary.component.html',
  styleUrl: './cart-order-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartOrderSummaryComponent {
  private readonly cartFacade = inject(CartFacade);

  summary = input.required<CartSummary>();

  protected readonly promoCode = signal('');
  protected readonly promoError = signal<string | null>(null);

  protected readonly couponApplying = this.cartFacade.couponApplying;

  protected onPromoInput(event: Event): void {
    this.promoCode.set((event.target as HTMLInputElement).value);
    this.promoError.set(null);
  }

  protected async applyPromo(): Promise<void> {
    const code = this.promoCode().trim();
    if (!code) {
      this.promoError.set('Enter a promo code.');
      return;
    }

    this.promoError.set(null);

    try {
      await this.cartFacade.applyCoupon(code);
      this.promoCode.set('');
    } catch {
      this.promoError.set(this.cartFacade.error() ?? 'Unable to apply this promo code.');
    }
  }
}

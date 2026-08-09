import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
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
  private readonly translate = inject(TranslateService);
  private readonly messageService = inject(MessageService);

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
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('CART.COUPON_APPLIED'),
        detail: code,
        life: 3000,
      });
    } catch {
      const message = this.cartFacade.error() ?? this.translate.instant('CART.COUPON_ERROR');
      this.promoError.set(message);
      this.messageService.add({ severity: 'error', summary: message, life: 4000 });
    }
  }
}

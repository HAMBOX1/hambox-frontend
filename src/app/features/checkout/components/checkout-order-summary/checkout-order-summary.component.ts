import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { CheckoutFacade } from '../../services/checkout.facade';
import { CartFacade } from '../../../cart/services/cart.facade';

@Component({
  selector: 'app-checkout-order-summary',
  standalone: true,
  imports: [HamboxCurrencyPipe, TranslatePipe],
  templateUrl: './checkout-order-summary.component.html',
  styleUrl: './checkout-order-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutOrderSummaryComponent {
  private readonly checkout = inject(CheckoutFacade);
  private readonly cartFacade = inject(CartFacade);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  protected readonly items = this.checkout.orderItems;
  protected readonly summary = this.checkout.summary;
  protected readonly discountCode = this.checkout.discountCode;
  protected readonly discountError = this.checkout.discountError;
  protected readonly discountApplying = this.checkout.discountApplying;
  protected readonly submitting = this.checkout.submitting;
  protected readonly error = this.checkout.error;
  protected readonly isDevelopmentCheckout = this.checkout.isDevelopmentCheckout;
  protected readonly actionError = signal<string | null>(null);

  protected onDiscountInput(event: Event): void {
    this.checkout.setDiscountCode((event.target as HTMLInputElement).value);
  }

  protected async applyDiscount(): Promise<void> {
    await this.checkout.applyDiscount();
  }

  protected async removeCoupon(): Promise<void> {
    await this.checkout.removeDiscount();
  }

  protected async completePurchase(): Promise<void> {
    this.actionError.set(null);

    if (this.cartFacade.isEmpty()) {
      this.actionError.set(this.translate.instant('CHECKOUT.CART_EMPTY_ERROR'));
      return;
    }

    const billing = this.checkout.billingDetails();
    if (!billing.email.trim()) {
      this.actionError.set(this.translate.instant('CHECKOUT.EMAIL_REQUIRED_ERROR'));
      return;
    }

    await this.router.navigate(['/checkout/processing'], {
      queryParams: { mode: 'checkout' },
    });
  }
}

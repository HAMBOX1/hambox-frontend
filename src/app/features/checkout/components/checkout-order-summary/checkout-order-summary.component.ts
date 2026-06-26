import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { CheckoutFacade } from '../../services/checkout.facade';
import { CartFacade } from '../../../cart/services/cart.facade';

@Component({
  selector: 'app-checkout-order-summary',
  standalone: true,
  imports: [HamboxCurrencyPipe],
  templateUrl: './checkout-order-summary.component.html',
  styleUrl: './checkout-order-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutOrderSummaryComponent {
  private readonly checkout = inject(CheckoutFacade);
  private readonly cartFacade = inject(CartFacade);
  private readonly router = inject(Router);

  protected readonly items = this.checkout.orderItems;
  protected readonly summary = this.checkout.summary;
  protected readonly discountCode = this.checkout.discountCode;
  protected readonly submitting = this.checkout.submitting;
  protected readonly error = this.checkout.error;
  protected readonly actionError = signal<string | null>(null);

  protected onDiscountInput(event: Event): void {
    this.checkout.setDiscountCode((event.target as HTMLInputElement).value);
  }

  protected applyDiscount(): void {
    this.checkout.applyDiscount();
  }

  protected async completePurchase(): Promise<void> {
    this.actionError.set(null);

    if (this.cartFacade.isEmpty()) {
      this.actionError.set('Your cart is empty.');
      return;
    }

    try {
      const order = await this.checkout.submitOrder();
      await this.router.navigate(['/checkout/processing'], {
        queryParams: { orderId: order.id },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : this.error() ?? 'Checkout failed. Please try again.';
      this.actionError.set(message);
    }
  }
}

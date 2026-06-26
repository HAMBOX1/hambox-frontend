import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { ApiError } from '../../../core/models/api-error.model';
import { CartFacade } from '../../cart/services/cart.facade';
import { OrderApiDto } from '../../cart/models/cart-api.model';
import { CheckoutService } from './checkout.service';
import {
  BillingDetails,
  CardPaymentDetails,
  CheckoutOrderItem,
  CheckoutSummary,
  PaymentMethodId,
} from '../models/checkout';
import { mapOrderToSuccessDetails } from '../utils/checkout.mapper';

const INITIAL_CARD: CardPaymentDetails = {
  cardholderName: '',
  cardNumber: '',
  expiryDate: '',
  cvc: '',
};

const INITIAL_BILLING: BillingDetails = {
  email: '',
  country: 'US',
};

@Injectable({
  providedIn: 'root',
})
export class CheckoutFacade {
  private readonly cartFacade = inject(CartFacade);
  private readonly checkoutService = inject(CheckoutService);
  private readonly authSession = inject(AuthSessionService);

  private readonly paymentMethodState = signal<PaymentMethodId>('card');
  private readonly cardDetailsState = signal<CardPaymentDetails>({ ...INITIAL_CARD });
  private readonly billingDetailsState = signal<BillingDetails>({ ...INITIAL_BILLING });
  private readonly discountCodeState = signal('');
  private readonly submittingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly lastOrderState = signal<OrderApiDto | null>(null);

  readonly paymentMethod = this.paymentMethodState.asReadonly();
  readonly cardDetails = this.cardDetailsState.asReadonly();
  readonly billingDetails = this.billingDetailsState.asReadonly();
  readonly discountCode = this.discountCodeState.asReadonly();
  readonly submitting = this.submittingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly lastOrder = this.lastOrderState.asReadonly();

  readonly orderItems = computed<readonly CheckoutOrderItem[]>(() =>
    this.cartFacade.items().map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: `Qty ${item.quantity}`,
      imageUrl: item.imageUrl,
      deliveryBadge: item.instantDelivery ? 'Instant Digital' : 'Digital Delivery',
      price: item.price * item.quantity,
    })),
  );

  readonly summary = computed<CheckoutSummary>(() => {
    const cartSummary = this.cartFacade.summary();
    return {
      subtotal: cartSummary.subtotal,
      memberDiscount: cartSummary.discountAmount,
      tax: cartSummary.tax,
      total: cartSummary.total,
    };
  });

  initialize(): void {
    const userEmail = this.authSession.user()?.email;
    if (userEmail) {
      this.billingDetailsState.update((details) =>
        details.email ? details : { ...details, email: userEmail },
      );
    }
  }

  selectPaymentMethod(method: PaymentMethodId): void {
    this.paymentMethodState.set(method);
  }

  updateCardField<K extends keyof CardPaymentDetails>(
    field: K,
    value: CardPaymentDetails[K],
  ): void {
    this.cardDetailsState.update((details) => ({ ...details, [field]: value }));
  }

  updateBillingField<K extends keyof BillingDetails>(
    field: K,
    value: BillingDetails[K],
  ): void {
    this.billingDetailsState.update((details) => ({ ...details, [field]: value }));
  }

  setDiscountCode(code: string): void {
    this.discountCodeState.set(code);
  }

  applyDiscount(): void {
    // Promo codes are not part of Sprint 1 checkout scope.
  }

  async submitOrder(): Promise<OrderApiDto> {
    const billing = this.billingDetailsState();
    if (!billing.email.trim()) {
      throw new Error('Email is required to complete checkout.');
    }

    this.submittingState.set(true);
    this.errorState.set(null);

    try {
      const order = await firstValueFrom(
        this.checkoutService.checkout({
          email: billing.email.trim(),
          country: billing.country,
          paymentMethod: this.paymentMethodState(),
        }),
      );

      this.lastOrderState.set(order);
      await this.cartFacade.load();
      return order;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Checkout failed. Please try again.'));
      throw error;
    } finally {
      this.submittingState.set(false);
    }
  }

  async loadOrder(orderId: string): Promise<ReturnType<typeof mapOrderToSuccessDetails>> {
    const order = await firstValueFrom(this.checkoutService.getOrder(orderId));
    return mapOrderToSuccessDetails(order);
  }

  reset(): void {
    this.paymentMethodState.set('card');
    this.cardDetailsState.set({ ...INITIAL_CARD });
    this.billingDetailsState.set({ ...INITIAL_BILLING });
    this.discountCodeState.set('');
    this.errorState.set(null);
    this.lastOrderState.set(null);
    this.initialize();
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      return error.message;
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallback;
  }
}

import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { ApiError } from '../../../core/models/api-error.model';
import { clearIdempotencyKey, getOrCreateIdempotencyKey } from '../../../shared/utils/idempotency-key.util';
import { CartFacade } from '../../cart/services/cart.facade';
import { OrderApiDto } from '../../cart/models/cart-api.model';
import { CheckoutService } from './checkout.service';
import {
  BillingDetails,
  CardPaymentDetails,
  CheckoutOrderItem,
  CheckoutSummary,
  DOT_FAWRY_WALLET_IDS,
  DOT_FAWRY_WALLET_OPERATOR,
  DOT_WALLET_IDS,
  DOT_WALLET_OPERATOR,
  DotCheckoutInitiationDto,
  DotFawryCheckoutInitiationDto,
  DotFawryPaymentStatusDto,
  DotPaymentStatusDto,
  isDotFawryWallet,
  isDotWallet,
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
  phoneNumber: '',
  customerName: '',
};

const IDEMPOTENCY_SCOPE = 'checkout';
const DOT_IDEMPOTENCY_SCOPE = 'checkout-dot';
const DOT_FAWRY_IDEMPOTENCY_SCOPE = 'checkout-dot-fawry';

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
  private readonly discountErrorState = signal<string | null>(null);
  private readonly discountApplyingState = signal(false);
  private readonly submittingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly lastOrderState = signal<OrderApiDto | null>(null);
  private readonly developmentCheckoutEnabledState = signal(false);
  private readonly dotCheckoutEnabledState = signal(false);
  private readonly dotFawryCheckoutEnabledState = signal(false);
  private readonly configurationLoadingState = signal(false);

  readonly paymentMethod = this.paymentMethodState.asReadonly();
  readonly cardDetails = this.cardDetailsState.asReadonly();
  readonly billingDetails = this.billingDetailsState.asReadonly();
  readonly discountCode = this.discountCodeState.asReadonly();
  readonly discountError = this.discountErrorState.asReadonly();
  readonly discountApplying = this.discountApplyingState.asReadonly();
  readonly submitting = this.submittingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly lastOrder = this.lastOrderState.asReadonly();
  readonly developmentCheckoutEnabled = this.developmentCheckoutEnabledState.asReadonly();
  readonly configurationLoading = this.configurationLoadingState.asReadonly();

  /**
   * Only "card" is offered — PayPal/crypto/Apple Pay have no backend integration and would silently
   * fall through to the same no-op ImmediatePaymentProvider as "card", collecting no real payment.
   * Do not re-add them here until a real provider exists for each. Fawry (Direct Billing, in-app,
   * gated by dotFawryCheckoutEnabled) is confirmed working directly against DOT. Orange Cash and
   * Vodafone Cash go through a different DOT product — the OTP redirect flow, same shape as the
   * generic "dot" carrier-billing option — gated by dotCheckoutEnabled instead, since that's the
   * flag for that product's own price-point/credential configuration.
   */
  readonly availablePaymentMethods = computed<readonly PaymentMethodId[]>(() => {
    const methods: PaymentMethodId[] = ['card'];
    if (this.dotCheckoutEnabledState()) {
      methods.push('dot', ...DOT_WALLET_IDS);
    }
    if (this.dotFawryCheckoutEnabledState()) {
      methods.push(...DOT_FAWRY_WALLET_IDS);
    }
    if (this.developmentCheckoutEnabledState()) {
      return ['development', ...methods];
    }
    return methods;
  });

  readonly isDevelopmentCheckout = computed(
    () => this.paymentMethodState() === 'development' && this.developmentCheckoutEnabledState(),
  );

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
      totalDiscount: cartSummary.totalDiscount,
      tax: cartSummary.tax,
      total: cartSummary.total,
      appliedPromotions: cartSummary.appliedPromotions,
      validationErrors: cartSummary.validationErrors,
      appliedCouponCode: cartSummary.appliedCouponCode,
    };
  });

  initialize(): void {
    const userEmail = this.authSession.user()?.email;
    if (userEmail) {
      this.billingDetailsState.update((details) =>
        details.email ? details : { ...details, email: userEmail },
      );
    }

    const appliedCoupon = this.cartFacade.summary().appliedCouponCode;
    if (appliedCoupon) {
      this.discountCodeState.set(appliedCoupon);
    }

    void this.loadConfiguration();
  }

  /**
   * Discards any idempotency key left over from a previous visit. `reset()` never runs on a plain
   * checkout page load (only on an explicit full reset), so without this a key that outlived its
   * attempt — the customer navigated away before retrying, or came back much later in the same
   * tab/session — sits in sessionStorage indefinitely. Reusing it on the next attempt either throws
   * "already used with a different request" (if anything changed) or silently replays the old
   * cached response (if nothing did) instead of actually submitting. A fresh page visit is always
   * the start of a new attempt, so it's safe to discard here.
   */
  clearStaleIdempotencyKeys(): void {
    clearIdempotencyKey(IDEMPOTENCY_SCOPE);
    clearIdempotencyKey(DOT_IDEMPOTENCY_SCOPE);
    clearIdempotencyKey(DOT_FAWRY_IDEMPOTENCY_SCOPE);
  }

  async loadConfiguration(): Promise<void> {
    this.configurationLoadingState.set(true);

    try {
      const configuration = await firstValueFrom(this.checkoutService.getConfiguration());
      this.developmentCheckoutEnabledState.set(configuration.developmentCheckoutEnabled);
      this.dotCheckoutEnabledState.set(configuration.dotCheckoutEnabled);
      this.dotFawryCheckoutEnabledState.set(configuration.dotFawryCheckoutEnabled);
      if (configuration.developmentCheckoutEnabled) {
        this.paymentMethodState.set('development');
      }
    } catch {
      this.developmentCheckoutEnabledState.set(false);
      this.dotCheckoutEnabledState.set(false);
      this.dotFawryCheckoutEnabledState.set(false);
    } finally {
      this.configurationLoadingState.set(false);
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
    this.discountErrorState.set(null);
  }

  async applyDiscount(): Promise<void> {
    const code = this.discountCodeState().trim();
    if (!code) {
      this.discountErrorState.set('Enter a coupon code.');
      return;
    }

    this.discountApplyingState.set(true);
    this.discountErrorState.set(null);

    try {
      const country = this.billingDetailsState().country;
      await this.cartFacade.applyCoupon(code, country);
      const validationErrors = this.cartFacade.summary().validationErrors;
      if (validationErrors.length > 0) {
        this.discountErrorState.set(validationErrors.join(' '));
      }
    } catch (error) {
      this.discountErrorState.set(this.toErrorMessage(error, 'Unable to apply coupon.'));
    } finally {
      this.discountApplyingState.set(false);
    }
  }

  async removeDiscount(): Promise<void> {
    this.discountApplyingState.set(true);
    this.discountErrorState.set(null);

    try {
      const country = this.billingDetailsState().country;
      await this.cartFacade.removeCoupon(country);
      this.discountCodeState.set('');
    } catch (error) {
      this.discountErrorState.set(this.toErrorMessage(error, 'Unable to remove coupon.'));
    } finally {
      this.discountApplyingState.set(false);
    }
  }

  async submitOrder(): Promise<OrderApiDto> {
    const billing = this.billingDetailsState();
    if (!billing.email.trim()) {
      throw new Error('Email is required to complete checkout.');
    }

    this.submittingState.set(true);
    this.errorState.set(null);

    try {
      const idempotencyKey = getOrCreateIdempotencyKey(IDEMPOTENCY_SCOPE);
      const order = await firstValueFrom(
        this.checkoutService.checkout(
          {
            email: billing.email.trim(),
            country: billing.country,
            paymentMethod: this.paymentMethodState(),
          },
          idempotencyKey,
        ),
      );

      clearIdempotencyKey(IDEMPOTENCY_SCOPE);
      this.lastOrderState.set(order);
      await this.cartFacade.load();
      return order;
    } catch (error) {
      // A failed attempt (validation, out of stock, etc.) must not leave a stale key behind —
      // otherwise retrying with any changed field (coupon, cart) gets rejected as a payload
      // mismatch instead of actually retrying.
      clearIdempotencyKey(IDEMPOTENCY_SCOPE);
      this.errorState.set(this.toErrorMessage(error, 'Checkout failed. Please try again.'));
      throw error;
    } finally {
      this.submittingState.set(false);
    }
  }

  /**
   * Initiates DOT checkout and returns the redirect target — callers must navigate the browser to
   * `otpLandingPageUrl` themselves (a full page navigation, not an in-app route). Unlike
   * {@link submitOrder}, this never resolves to a finished order: the order stays Pending until the
   * customer completes OTP with DOT and HAMBOX verifies the charge server-to-server.
   */
  async initiateDotCheckout(): Promise<DotCheckoutInitiationDto> {
    const billing = this.billingDetailsState();
    if (!billing.email.trim()) {
      throw new Error('Email is required to complete checkout.');
    }

    this.submittingState.set(true);
    this.errorState.set(null);

    try {
      const method = this.paymentMethodState();
      const wallet = isDotWallet(method) ? DOT_WALLET_OPERATOR[method] : 'OrangeCash';
      const idempotencyKey = getOrCreateIdempotencyKey(DOT_IDEMPOTENCY_SCOPE);
      const initiation = await firstValueFrom(
        this.checkoutService.initiateDotCheckout(
          { email: billing.email.trim(), country: billing.country, wallet },
          idempotencyKey,
        ),
      );

      clearIdempotencyKey(DOT_IDEMPOTENCY_SCOPE);
      return initiation;
    } catch (error) {
      clearIdempotencyKey(DOT_IDEMPOTENCY_SCOPE);
      this.errorState.set(this.toErrorMessage(error, 'Checkout failed. Please try again.'));
      throw error;
    } finally {
      this.submittingState.set(false);
    }
  }

  async getDotPaymentStatus(paymentAttemptId: string): Promise<DotPaymentStatusDto> {
    return firstValueFrom(this.checkoutService.getDotPaymentStatus(paymentAttemptId));
  }

  /**
   * Initiates a DOT Fawry Direct Billing checkout for whichever of the three mobile wallets
   * (Fawry/Orange Cash/Vodafone Cash) is currently selected in {@link paymentMethod}. Unlike
   * {@link initiateDotCheckout}, there is no browser redirect — the returned
   * {@link DotFawryCheckoutInitiationDto.fawryReferenceNumber} is shown directly to the customer to
   * complete payment in their wallet, and the caller navigates to the in-app result page to poll
   * status.
   */
  async initiateDotFawryCheckout(): Promise<DotFawryCheckoutInitiationDto> {
    const billing = this.billingDetailsState();
    if (!billing.email.trim()) {
      throw new Error('Email is required to complete checkout.');
    }
    if (!billing.phoneNumber.trim()) {
      throw new Error('A mobile number is required to pay with Fawry.');
    }

    this.submittingState.set(true);
    this.errorState.set(null);

    try {
      const method = this.paymentMethodState();
      const wallet = isDotFawryWallet(method) ? DOT_FAWRY_WALLET_OPERATOR[method] : 'Fawry';
      const idempotencyKey = getOrCreateIdempotencyKey(DOT_FAWRY_IDEMPOTENCY_SCOPE);
      const initiation = await firstValueFrom(
        this.checkoutService.initiateDotFawryCheckout(
          {
            email: billing.email.trim(),
            country: billing.country,
            phoneNumber: billing.phoneNumber.trim(),
            customerName: billing.customerName.trim() || null,
            wallet,
          },
          idempotencyKey,
        ),
      );

      clearIdempotencyKey(DOT_FAWRY_IDEMPOTENCY_SCOPE);
      return initiation;
    } catch (error) {
      clearIdempotencyKey(DOT_FAWRY_IDEMPOTENCY_SCOPE);
      this.errorState.set(this.toErrorMessage(error, 'Checkout failed. Please try again.'));
      throw error;
    } finally {
      this.submittingState.set(false);
    }
  }

  async getDotFawryPaymentStatus(paymentAttemptId: string): Promise<DotFawryPaymentStatusDto> {
    return firstValueFrom(this.checkoutService.getDotFawryPaymentStatus(paymentAttemptId));
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
    this.discountErrorState.set(null);
    this.errorState.set(null);
    this.lastOrderState.set(null);
    clearIdempotencyKey(IDEMPOTENCY_SCOPE);
    clearIdempotencyKey(DOT_IDEMPOTENCY_SCOPE);
    clearIdempotencyKey(DOT_FAWRY_IDEMPOTENCY_SCOPE);
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

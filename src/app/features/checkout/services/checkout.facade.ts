import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { ProductImageCacheService } from '../../../core/product/product-image-cache.service';
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
  DotCheckoutInitiationDto,
  DotFawryCheckoutInitiationDto,
  DotFawryPaymentStatusDto,
  DotPaymentStatusDto,
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
  private readonly imageCache = inject(ProductImageCacheService);

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
   * Do not re-add them here until a real provider exists for each. "dot" only appears once the
   * backend reports it's actually usable (see CheckoutConfigurationDto.dotCheckoutEnabled) — DOT's
   * pricing model isn't confirmed yet, so it stays hidden until the backend flips that flag.
   */
  readonly availablePaymentMethods = computed<readonly PaymentMethodId[]>(() => {
    const methods: PaymentMethodId[] = ['card'];
    if (this.dotCheckoutEnabledState()) {
      methods.push('dot');
    }
    if (this.dotFawryCheckoutEnabledState()) {
      methods.push('dot-fawry');
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
      const idempotencyKey = getOrCreateIdempotencyKey(DOT_IDEMPOTENCY_SCOPE);
      const initiation = await firstValueFrom(
        this.checkoutService.initiateDotCheckout(
          { email: billing.email.trim(), country: billing.country },
          idempotencyKey,
        ),
      );

      clearIdempotencyKey(DOT_IDEMPOTENCY_SCOPE);
      return initiation;
    } catch (error) {
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
   * Initiates a DOT Fawry checkout. Unlike {@link initiateDotCheckout}, there is no browser
   * redirect — the returned {@link DotFawryCheckoutInitiationDto.fawryReferenceNumber} is shown
   * directly to the customer to complete payment in their Fawry wallet, and the caller navigates
   * to the in-app result page to poll status.
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
      const idempotencyKey = getOrCreateIdempotencyKey(DOT_FAWRY_IDEMPOTENCY_SCOPE);
      const initiation = await firstValueFrom(
        this.checkoutService.initiateDotFawryCheckout(
          {
            email: billing.email.trim(),
            country: billing.country,
            phoneNumber: billing.phoneNumber.trim(),
            customerName: billing.customerName.trim() || null,
          },
          idempotencyKey,
        ),
      );

      clearIdempotencyKey(DOT_FAWRY_IDEMPOTENCY_SCOPE);
      return initiation;
    } catch (error) {
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
    const details = mapOrderToSuccessDetails(order);
    const imageUrls = await this.imageCache.resolveMany(details.items.map((item) => item.id));

    return {
      ...details,
      items: details.items.map((item, index) => ({
        ...item,
        imageUrl: imageUrls.get(item.id) ?? item.imageUrl,
      })),
    };
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

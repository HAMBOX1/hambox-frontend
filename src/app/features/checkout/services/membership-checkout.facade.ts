import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { ApiError } from '../../../core/models/api-error.model';
import { OrderApiDto } from '../../cart/models/cart-api.model';
import { CheckoutService } from './checkout.service';
import {
  BillingDetails,
  CardPaymentDetails,
  PaymentMethodId,
} from '../models/checkout';
import {
  MembershipCheckoutPreviewApiDto,
  MembershipCheckoutService,
} from './membership-checkout.service';

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

@Injectable({ providedIn: 'root' })
export class MembershipCheckoutFacade {
  private readonly membershipCheckout = inject(MembershipCheckoutService);
  private readonly checkoutService = inject(CheckoutService);
  private readonly authSession = inject(AuthSessionService);

  private readonly previewState = signal<MembershipCheckoutPreviewApiDto | null>(null);
  private readonly planIdState = signal<string | null>(null);
  private readonly actionState = signal<string>('subscribe');
  private readonly paymentMethodState = signal<PaymentMethodId>('card');
  private readonly cardDetailsState = signal<CardPaymentDetails>({ ...INITIAL_CARD });
  private readonly billingDetailsState = signal<BillingDetails>({ ...INITIAL_BILLING });
  private readonly discountCodeState = signal('');
  private readonly loadingState = signal(false);
  private readonly submittingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly developmentCheckoutEnabledState = signal(false);

  readonly preview = this.previewState.asReadonly();
  readonly planId = this.planIdState.asReadonly();
  readonly action = this.actionState.asReadonly();
  readonly paymentMethod = this.paymentMethodState.asReadonly();
  readonly cardDetails = this.cardDetailsState.asReadonly();
  readonly billingDetails = this.billingDetailsState.asReadonly();
  readonly discountCode = this.discountCodeState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly submitting = this.submittingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  readonly availablePaymentMethods = computed<readonly PaymentMethodId[]>(() => {
    const methods: PaymentMethodId[] = ['card', 'paypal', 'crypto', 'apple-pay'];
    if (this.developmentCheckoutEnabledState()) {
      return ['development', ...methods];
    }
    return methods;
  });

  async initialize(planId: string, action: string): Promise<void> {
    this.planIdState.set(planId);
    this.actionState.set(action);
    this.errorState.set(null);

    const userEmail = this.authSession.user()?.email;
    if (userEmail) {
      this.billingDetailsState.update((details) =>
        details.email ? details : { ...details, email: userEmail },
      );
    }

    try {
      const configuration = await firstValueFrom(this.checkoutService.getConfiguration());
      this.developmentCheckoutEnabledState.set(configuration.developmentCheckoutEnabled);
      if (configuration.developmentCheckoutEnabled) {
        this.paymentMethodState.set('development');
      }
    } catch {
      this.developmentCheckoutEnabledState.set(false);
    }

    await this.loadPreview();
  }

  async loadPreview(): Promise<void> {
    const planId = this.planIdState();
    const action = this.actionState();
    if (!planId) {
      return;
    }

    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const preview = await firstValueFrom(
        this.membershipCheckout.getPreview(planId, action, this.discountCodeState()),
      );
      this.previewState.set(preview);
    } catch (error) {
      this.previewState.set(null);
      this.errorState.set(this.toErrorMessage(error, 'Unable to load membership checkout.'));
    } finally {
      this.loadingState.set(false);
    }
  }

  selectPaymentMethod(method: PaymentMethodId): void {
    this.paymentMethodState.set(method);
  }

  updateCardField<K extends keyof CardPaymentDetails>(field: K, value: CardPaymentDetails[K]): void {
    this.cardDetailsState.update((details) => ({ ...details, [field]: value }));
  }

  updateBillingField<K extends keyof BillingDetails>(field: K, value: BillingDetails[K]): void {
    this.billingDetailsState.update((details) => ({ ...details, [field]: value }));
  }

  setDiscountCode(code: string): void {
    this.discountCodeState.set(code);
  }

  async applyDiscount(): Promise<void> {
    await this.loadPreview();
  }

  async submitCheckout(): Promise<OrderApiDto> {
    const planId = this.planIdState();
    const preview = this.previewState();
    const billing = this.billingDetailsState();

    if (!planId || !preview) {
      throw new Error('Membership checkout is not ready.');
    }

    if (!billing.email.trim()) {
      throw new Error('Email is required to complete checkout.');
    }

    this.submittingState.set(true);
    this.errorState.set(null);

    try {
      const order = await firstValueFrom(
        this.membershipCheckout.checkout({
          planId,
          action: this.actionState(),
          email: billing.email.trim(),
          country: billing.country,
          paymentMethod: this.paymentMethodState(),
          couponCode: this.discountCodeState().trim() || null,
        }),
      );
      return order;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Membership checkout failed.'));
      throw error;
    } finally {
      this.submittingState.set(false);
    }
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

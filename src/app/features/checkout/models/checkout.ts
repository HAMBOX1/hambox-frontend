import type { AppliedPromotion } from '../../cart/models/cart';

export type PaymentMethodId = 'card' | 'paypal' | 'crypto' | 'apple-pay' | 'development' | 'dot' | 'dot-fawry';

export interface PaymentMethodOption {
  id: PaymentMethodId;
  label: string;
}

export interface CheckoutOrderItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  deliveryBadge: string;
  price: number;
}

export interface CheckoutSummary {
  subtotal: number;
  totalDiscount: number;
  tax: number;
  total: number;
  appliedPromotions: readonly AppliedPromotion[];
  validationErrors: readonly string[];
  appliedCouponCode: string | null;
}

export interface CardPaymentDetails {
  cardholderName: string;
  cardNumber: string;
  expiryDate: string;
  cvc: string;
}

export interface BillingDetails {
  email: string;
  country: string;
  phoneNumber: string;
  customerName: string;
}

export interface CheckoutConfigurationDto {
  readonly developmentCheckoutEnabled: boolean;
  readonly dotCheckoutEnabled: boolean;
  readonly dotFawryCheckoutEnabled: boolean;
}

export interface DotCheckoutInitiationDto {
  readonly paymentAttemptId: string;
  readonly orderId: string;
  readonly otpLandingPageUrl: string;
  readonly expiresOnUtc: string;
}

export type DotPaymentStatus = 'Pending' | 'Succeeded' | 'Failed' | 'Expired';

export interface DotPaymentStatusDto {
  readonly paymentAttemptId: string;
  readonly orderId: string;
  readonly status: DotPaymentStatus;
  readonly completedOrderId: string | null;
}

export interface DotFawryCheckoutInitiationDto {
  readonly paymentAttemptId: string;
  readonly orderId: string;
  readonly fawryReferenceNumber: string | null;
  readonly expiresOnUtc: string;
}

export type DotFawryPaymentStatus = 'AwaitingPayment' | 'Succeeded' | 'Failed' | 'Expired';

export interface DotFawryPaymentStatusDto {
  readonly paymentAttemptId: string;
  readonly orderId: string;
  readonly status: DotFawryPaymentStatus;
  readonly fawryReferenceNumber: string | null;
  readonly completedOrderId: string | null;
}

export interface CountryOption {
  value: string;
  label: string;
}

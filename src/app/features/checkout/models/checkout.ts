import type { AppliedPromotion } from '../../cart/models/cart';

export type PaymentMethodId = 'card' | 'paypal' | 'crypto' | 'apple-pay' | 'development';

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
}

export interface CheckoutConfigurationDto {
  readonly developmentCheckoutEnabled: boolean;
}

export interface CountryOption {
  value: string;
  label: string;
}

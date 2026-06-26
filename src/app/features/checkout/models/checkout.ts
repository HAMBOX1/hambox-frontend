export type PaymentMethodId = 'card' | 'paypal' | 'crypto' | 'apple-pay';

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
  memberDiscount: number;
  tax: number;
  total: number;
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

export interface CountryOption {
  value: string;
  label: string;
}

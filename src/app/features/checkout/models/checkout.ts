import type { AppliedPromotion } from '../../cart/models/cart';

export type PaymentMethodId =
  | 'card'
  | 'paypal'
  | 'crypto'
  | 'apple-pay'
  | 'development'
  | 'dot'
  | 'fawry'
  | 'orange-cash'
  | 'vodafone-cash';

/** The three Egyptian mobile wallets served by the DOT Fawry Direct Billing checkout flow. */
export type DotFawryWalletId = 'fawry' | 'orange-cash' | 'vodafone-cash';

export const DOT_FAWRY_WALLET_IDS: readonly DotFawryWalletId[] = ['fawry', 'orange-cash', 'vodafone-cash'];

export function isDotFawryWallet(method: PaymentMethodId): method is DotFawryWalletId {
  return (DOT_FAWRY_WALLET_IDS as readonly PaymentMethodId[]).includes(method);
}

/** Maps a frontend wallet id to the backend's `DotFawryWalletOperator` member name, sent as `wallet` on initiate. */
export const DOT_FAWRY_WALLET_OPERATOR: Record<DotFawryWalletId, string> = {
  fawry: 'Fawry',
  'orange-cash': 'OrangeCash',
  'vodafone-cash': 'VodafoneCash',
};

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
  readonly operator: string;
}

export type DotFawryPaymentStatus = 'AwaitingPayment' | 'Succeeded' | 'Failed' | 'Expired';

export interface DotFawryPaymentStatusDto {
  readonly paymentAttemptId: string;
  readonly orderId: string;
  readonly status: DotFawryPaymentStatus;
  readonly fawryReferenceNumber: string | null;
  readonly completedOrderId: string | null;
  readonly operator: string;
}

export interface CountryOption {
  value: string;
  label: string;
}

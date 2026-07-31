export interface CartItemApiDto {
  readonly productId: string;
  readonly productVariantId: string | null;
  readonly variantSku: string | null;
  readonly productNameEn: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly lineTotal: number;
  readonly platform?: string | null;
  readonly region?: string | null;
  readonly edition?: string | null;
  readonly variantSummary?: string | null;
  readonly imageUrl?: string | null;
}

export interface AppliedPromotionApiDto {
  readonly promotionId: string;
  readonly name: string;
  readonly type: string;
  readonly couponCode: string | null;
  readonly discountAmount: number;
  readonly isAutomatic: boolean;
  readonly description: string | null;
}

export interface CartTotalsApiDto {
  readonly subtotal: number;
  readonly totalDiscount: number;
  readonly tax: number;
  readonly total: number;
  readonly itemCount: number;
  readonly appliedPromotions: readonly AppliedPromotionApiDto[];
  readonly validationErrors: readonly string[];
  readonly appliedCouponCode: string | null;
}

export interface CartApiDto {
  readonly cartId: string | null;
  readonly guestSessionId: string | null;
  readonly items: readonly CartItemApiDto[];
  readonly totals: CartTotalsApiDto;
}

export interface OrderItemApiDto {
  readonly productId: string;
  readonly productNameEn: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly lineTotal: number;
  readonly imageUrl?: string | null;
}

export interface OrderApiDto {
  readonly id: string;
  readonly orderNumber: string;
  readonly status: string;
  readonly email: string;
  readonly country: string;
  readonly paymentMethod: string;
  readonly subtotal: number;
  readonly discountAmount: number;
  readonly taxAmount: number;
  readonly totalAmount: number;
  readonly items: readonly OrderItemApiDto[];
  readonly createdOnUtc: string;
}

export interface AddCartItemRequest {
  readonly productId: string;
  readonly quantity: number;
  readonly productVariantId?: string | null;
}

export interface UpdateCartItemRequest {
  readonly quantity: number;
}

export interface MergeCartRequest {
  readonly guestSessionId: string;
}

export interface CheckoutRequest {
  readonly email: string;
  readonly country: string;
  readonly paymentMethod: string;
}

export interface ApplyCartCouponRequest {
  readonly couponCode: string;
  readonly country?: string;
}

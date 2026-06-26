export interface CartItemApiDto {
  readonly productId: string;
  readonly productNameEn: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly lineTotal: number;
}

export interface CartTotalsApiDto {
  readonly subtotal: number;
  readonly memberDiscount: number;
  readonly tax: number;
  readonly total: number;
  readonly itemCount: number;
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

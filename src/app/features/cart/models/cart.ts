export interface CartLineItem {
  id: string;
  productId: string;
  productVariantId: string | null;
  variantSku: string | null;
  title: string;
  imageUrl: string;
  platformIconUrl?: string;
  platform?: string | null;
  region?: string | null;
  edition?: string | null;
  variantSummary?: string | null;
  price: number;
  originalPrice?: number;
  quantity: number;
  instantDelivery: boolean;
}

export interface AppliedPromotion {
  promotionId: string;
  name: string;
  type: string;
  couponCode: string | null;
  discountAmount: number;
  isAutomatic: boolean;
  description: string | null;
}

export interface CartSummary {
  subtotal: number;
  totalDiscount: number;
  tax: number;
  total: number;
  itemCount: number;
  appliedPromotions: readonly AppliedPromotion[];
  validationErrors: readonly string[];
  appliedCouponCode: string | null;
}

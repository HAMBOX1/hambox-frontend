import {
  AppliedPromotionApiDto,
  CartApiDto,
  CartItemApiDto,
  CartTotalsApiDto,
} from '../models/cart-api.model';
import { AppliedPromotion, CartLineItem, CartSummary } from '../models/cart';
import { productPlaceholderImage } from '../../home/utils/storefront-home.mapper';

export function mapAppliedPromotion(dto: AppliedPromotionApiDto): AppliedPromotion {
  return {
    promotionId: dto.promotionId,
    name: dto.name,
    type: dto.type,
    couponCode: dto.couponCode,
    discountAmount: dto.discountAmount,
    isAutomatic: dto.isAutomatic,
    description: dto.description,
  };
}

export function mapCartLineItem(item: CartItemApiDto, index = 0): CartLineItem {
  const lineId = item.productVariantId
    ? `${item.productId}:${item.productVariantId}`
    : item.productId;

  const variantSummary =
    item.variantSummary?.trim() ||
    [item.platform, item.region, item.edition, item.variantSku].filter(Boolean).join(' · ') ||
    null;

  return {
    id: lineId,
    productId: item.productId,
    productVariantId: item.productVariantId,
    variantSku: item.variantSku,
    title: item.productNameEn,
    imageUrl: productPlaceholderImage(index),
    platform: item.platform ?? null,
    region: item.region ?? null,
    edition: item.edition ?? null,
    variantSummary,
    price: item.unitPrice,
    quantity: item.quantity,
    instantDelivery: true,
  };
}

export function mapCartSummary(totals: CartTotalsApiDto): CartSummary {
  return {
    subtotal: totals.subtotal,
    totalDiscount: totals.totalDiscount,
    tax: totals.tax,
    total: totals.total,
    itemCount: totals.itemCount,
    appliedPromotions: (totals.appliedPromotions ?? []).map(mapAppliedPromotion),
    validationErrors: totals.validationErrors ?? [],
    appliedCouponCode: totals.appliedCouponCode,
  };
}

export function mapCartResponse(cart: CartApiDto): {
  readonly items: readonly CartLineItem[];
  readonly summary: CartSummary;
} {
  return {
    items: cart.items.map((item, index) => mapCartLineItem(item, index)),
    summary: mapCartSummary(cart.totals),
  };
}

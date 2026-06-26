import { CartApiDto, CartItemApiDto, CartTotalsApiDto } from '../models/cart-api.model';
import { CartLineItem, CartSummary } from '../models/cart';

const CART_ITEM_PLACEHOLDER_IMAGE = 'assets/images/deals/psn-card.jpg';

const MEMBER_DISCOUNT_PERCENT = 10;

export function mapCartLineItem(item: CartItemApiDto): CartLineItem {
  return {
    id: item.productId,
    title: item.productNameEn,
    imageUrl: CART_ITEM_PLACEHOLDER_IMAGE,
    price: item.unitPrice,
    quantity: item.quantity,
    instantDelivery: true,
  };
}

export function mapCartSummary(totals: CartTotalsApiDto): CartSummary {
  return {
    subtotal: totals.subtotal,
    discountLabel: `Rebel Member Discount (${MEMBER_DISCOUNT_PERCENT}%)`,
    discountAmount: totals.memberDiscount,
    tax: totals.tax,
    total: totals.total,
    itemCount: totals.itemCount,
  };
}

export function mapCartResponse(cart: CartApiDto): {
  readonly items: readonly CartLineItem[];
  readonly summary: CartSummary;
} {
  return {
    items: cart.items.map(mapCartLineItem),
    summary: mapCartSummary(cart.totals),
  };
}

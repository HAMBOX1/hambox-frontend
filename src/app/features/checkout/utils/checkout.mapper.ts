import { OrderApiDto } from '../../cart/models/cart-api.model';
import { OrderRecommendation, OrderSuccessDetails } from '../models/order-success';

const ORDER_ITEM_PLACEHOLDER_IMAGE = 'assets/images/placeholders/product.svg';

export function mapOrderToSuccessDetails(order: OrderApiDto): OrderSuccessDetails {
  return {
    orderId: order.orderNumber,
    items: order.items.map((item) => ({
      id: item.productId,
      title: item.productNameEn,
      subtitle: `Qty ${item.quantity}`,
      imageUrl: ORDER_ITEM_PLACEHOLDER_IMAGE,
      price: item.lineTotal,
    })),
    total: order.totalAmount,
  };
}

export function mapProductsToRecommendations(
  products: ReadonlyArray<{ id: string; title: string; priceUsd: number; imageUrl: string }>,
): readonly OrderRecommendation[] {
  return products.map((product) => ({
    id: product.id,
    title: product.title,
    priceUsd: product.priceUsd,
    imageUrl: product.imageUrl,
  }));
}

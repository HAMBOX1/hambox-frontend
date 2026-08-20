import { StorefrontProductConfigurationDto } from '../../catalog/models/inventory-api.model';
import { StoreProduct } from '../models/product';
import {
  productRequiresOptionSelection,
  resolveDirectCartVariantId,
} from './storefront-add-to-cart.util';
import { lowestPurchasablePrice } from './storefront-filter.util';
import { computeProductStockStatus, hasPurchasableInventory } from './storefront-product-stock.util';

/**
 * Applies real per-variant inventory to a raw {@link StoreProduct} guess (which only knows the
 * product's publish status, not its stock) — the same enrichment `ProductsFacade.enrichedItems`
 * applies to the main storefront grid. Any card-rendering surface that skips this call falls back to
 * the raw guess, which can show "Add to Cart" on an out-of-stock product or vice versa.
 */
export function applyStorefrontEnrichment(
  product: StoreProduct,
  configuration: StorefrontProductConfigurationDto | null | undefined,
): StoreProduct {
  const stockStatus = computeProductStockStatus(configuration, !product.outOfStock);
  const inStock = hasPurchasableInventory(configuration, !product.outOfStock);

  return {
    ...product,
    priceUsd: configuration ? lowestPurchasablePrice(configuration, product.priceUsd) : product.priceUsd,
    stockStatus,
    outOfStock: stockStatus === 'out-of-stock',
    cta: inStock ? product.cta : 'notify-me',
    requiresOptionSelection: productRequiresOptionSelection(configuration),
    directVariantId: resolveDirectCartVariantId(configuration),
  };
}

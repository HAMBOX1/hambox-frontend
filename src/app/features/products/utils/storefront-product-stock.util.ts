import { StorefrontProductConfigurationDto } from '../../catalog/models/inventory-api.model';
import { StoreProductStockStatus } from '../models/product';

export function isPurchasableVariant(
  variant: StorefrontProductConfigurationDto['variants'][number],
): boolean {
  return variant.availableStock > 0 && !variant.isOutOfStock;
}

export function computeProductStockStatus(
  configuration: StorefrontProductConfigurationDto | null | undefined,
  productActive: boolean,
): StoreProductStockStatus {
  if (!productActive) {
    return 'out-of-stock';
  }

  if (!configuration) {
    return 'unknown';
  }

  if (configuration.variants.length === 0) {
    return 'out-of-stock';
  }

  const purchasable = configuration.variants.filter(isPurchasableVariant);
  if (purchasable.length === 0) {
    return 'out-of-stock';
  }

  if (purchasable.some((variant) => variant.isLowStock)) {
    return 'low-stock';
  }

  return 'in-stock';
}

export function hasPurchasableInventory(
  configuration: StorefrontProductConfigurationDto | null | undefined,
  productActive: boolean,
): boolean {
  if (!productActive || !configuration) {
    return false;
  }

  return configuration.variants.some(isPurchasableVariant);
}

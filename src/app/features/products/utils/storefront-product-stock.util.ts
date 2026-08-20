import { StorefrontProductConfigurationDto } from '../../catalog/models/inventory-api.model';
import { StoreProductStockStatus } from '../models/product';

export function isPurchasableVariant(
  variant: StorefrontProductConfigurationDto['variants'][number],
): boolean {
  // isOutOfStock is the backend's single blended purchasability signal (manual stock OR a READY
  // automated-supplier route, per the variant's FulfillmentMode) — availableStock is a manual-only
  // display count that legitimately stays 0 for a supplier-fulfilled variant that IS purchasable,
  // so it must not gate here too. isCompleteCombination guards the separate case where a variant
  // has real stock but omits an option from one of the product's option groups (e.g. a "Value"
  // group added after this variant was created) — it can never actually be selected end-to-end
  // through the picker, so it must not count as purchasable either.
  return !variant.isOutOfStock && variant.isCompleteCombination;
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

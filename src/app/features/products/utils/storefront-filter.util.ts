import { StorefrontProductConfigurationDto } from '../../catalog/models/inventory-api.model';
import { StoreProduct } from '../models/product';
import { hasPurchasableInventory, isPurchasableVariant } from './storefront-product-stock.util';

export interface DynamicFilterGroup {
  readonly id: string;
  readonly label: string;
  readonly options: readonly DynamicFilterOption[];
}

export interface DynamicFilterOption {
  readonly id: string;
  readonly label: string;
  readonly count: number;
}

export function buildProductSearchHaystack(
  product: StoreProduct,
  configuration: StorefrontProductConfigurationDto | null | undefined,
): string {
  const parts = [
    product.title,
    product.platformLabel,
    product.categoryName ?? '',
    ...(configuration?.variants.map((variant) => variant.sku) ?? []),
    ...(configuration?.optionGroups.flatMap((group) =>
      group.options.map((option) => `${group.displayName} ${option.label} ${option.value}`),
    ) ?? []),
  ];

  return parts.join(' ').toLowerCase();
}

export function matchesEnhancedSearch(
  product: StoreProduct,
  configuration: StorefrontProductConfigurationDto | null | undefined,
  term: string,
): boolean {
  const normalized = term.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return buildProductSearchHaystack(product, configuration).includes(normalized);
}

export function countActiveAttributeFilters(
  attributeFilters: Readonly<Record<string, readonly string[]>>,
): number {
  return Object.values(attributeFilters).reduce((total, values) => total + values.length, 0);
}

export function productPassesStockFilter(
  configuration: StorefrontProductConfigurationDto | null | undefined,
  productActive: boolean,
  inStockOnly: boolean,
): boolean {
  if (!inStockOnly) {
    return true;
  }

  return hasPurchasableInventory(configuration, productActive);
}

export function lowestPurchasablePrice(
  configuration: StorefrontProductConfigurationDto | null | undefined,
  basePrice: number,
): number {
  if (!configuration?.variants.length) {
    return basePrice;
  }

  const prices = configuration.variants
    .filter(isPurchasableVariant)
    .map((variant) => variant.price);

  return prices.length ? Math.min(...prices) : basePrice;
}

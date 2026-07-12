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

export function buildDynamicFilterGroups(
  products: readonly StoreProduct[],
  configurations: Readonly<Record<string, StorefrontProductConfigurationDto>>,
): readonly DynamicFilterGroup[] {
  const groupMap = new Map<string, { label: string; options: Map<string, { label: string; count: number }> }>();

  for (const product of products) {
    const configuration = configurations[product.id];
    if (!configuration) {
      continue;
    }

    for (const group of configuration.optionGroups) {
      if (!group.options.length) {
        continue;
      }

      let entry = groupMap.get(group.id);
      if (!entry) {
        entry = { label: group.displayName, options: new Map() };
        groupMap.set(group.id, entry);
      }

      for (const option of group.options) {
        const hasVariant = configuration.variants.some(
          (variant) => variant.optionIds.includes(option.id),
        );
        if (!hasVariant) {
          continue;
        }

        const current = entry.options.get(option.id) ?? { label: option.label, count: 0 };
        entry.options.set(option.id, { ...current, count: current.count + 1 });
      }
    }
  }

  return [...groupMap.entries()]
    .map(([id, group]) => ({
      id,
      label: group.label,
      options: [...group.options.entries()]
        .map(([optionId, option]) => ({
          id: optionId,
          label: option.label,
          count: option.count,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    }))
    .filter((group) => group.options.length > 0)
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function productMatchesAttributeFilters(
  configuration: StorefrontProductConfigurationDto | null | undefined,
  attributeFilters: Readonly<Record<string, readonly string[]>>,
): boolean {
  if (!configuration) {
    return Object.values(attributeFilters).every((values) => values.length === 0);
  }

  const activeGroups = Object.entries(attributeFilters).filter(([, values]) => values.length > 0);
  if (!activeGroups.length) {
    return true;
  }

  return configuration.variants.some((variant) =>
    activeGroups.every(([groupId, optionIds]) =>
      variant.optionIds.some((optionId) => optionIds.includes(optionId)),
    ),
  );
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

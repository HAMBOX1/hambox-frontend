import { describe, expect, it } from 'vitest';

import { StorefrontProductConfigurationDto, StorefrontVariantDto } from '../../catalog/models/inventory-api.model';
import { computeProductStockStatus, hasPurchasableInventory, isPurchasableVariant } from './storefront-product-stock.util';

function variant(overrides: Partial<StorefrontVariantDto> = {}): StorefrontVariantDto {
  return {
    id: 'variant-1',
    sku: 'SKU-1',
    price: 10,
    comparePrice: null,
    availableStock: 1,
    isLowStock: false,
    isOutOfStock: false,
    optionIds: [],
    isCompleteCombination: true,
    ...overrides,
  };
}

function configuration(variants: readonly StorefrontVariantDto[]): StorefrontProductConfigurationDto {
  return { productId: 'product-1', basePrice: 10, optionGroups: [], variants };
}

describe('isPurchasableVariant', () => {
  it('is false for a complete variant with stock=0', () => {
    expect(isPurchasableVariant(variant({ isOutOfStock: true, isCompleteCombination: true }))).toBe(false);
  });

  it('is true for a complete variant with stock', () => {
    expect(isPurchasableVariant(variant({ isOutOfStock: false, isCompleteCombination: true }))).toBe(true);
  });

  it('is false for an incomplete variant even with stock (the reported bug)', () => {
    expect(isPurchasableVariant(variant({ isOutOfStock: false, isCompleteCombination: false }))).toBe(false);
  });
});

describe('computeProductStockStatus / hasPurchasableInventory', () => {
  it('reports Out of Stock when only incomplete variants carry stock', () => {
    // Exact reported scenario: "Global" and "US" have real stock but never got the product's
    // later-added "Value" option group, so the backend marks them incomplete; the only complete
    // combination ("US" + "Value=100") is out of stock.
    const config = configuration([
      variant({ id: 'global', availableStock: 5, isOutOfStock: false, isCompleteCombination: false }),
      variant({ id: 'us', availableStock: 3, isOutOfStock: false, isCompleteCombination: false }),
      variant({ id: 'us-100', availableStock: 0, isOutOfStock: true, isCompleteCombination: true }),
    ]);

    expect(computeProductStockStatus(config, true)).toBe('out-of-stock');
    expect(hasPurchasableInventory(config, true)).toBe(false);
  });

  it('reports In Stock once a complete combination actually has stock', () => {
    const config = configuration([
      variant({ id: 'global', availableStock: 5, isOutOfStock: false, isCompleteCombination: false }),
      variant({ id: 'us-100', availableStock: 4, isOutOfStock: false, isCompleteCombination: true }),
    ]);

    expect(computeProductStockStatus(config, true)).toBe('in-stock');
    expect(hasPurchasableInventory(config, true)).toBe(true);
  });
});

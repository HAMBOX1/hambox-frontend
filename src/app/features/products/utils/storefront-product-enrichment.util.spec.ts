import { describe, expect, it } from 'vitest';

import { StorefrontProductConfigurationDto, StorefrontVariantDto } from '../../catalog/models/inventory-api.model';
import { StoreProduct } from '../models/product';
import { applyStorefrontEnrichment } from './storefront-product-enrichment.util';

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

function configuration(
  variants: readonly StorefrontVariantDto[],
  overrides: Partial<StorefrontProductConfigurationDto> = {},
): StorefrontProductConfigurationDto {
  return { productId: 'product-1', basePrice: 10, optionGroups: [], variants, ...overrides };
}

function rawProduct(overrides: Partial<StoreProduct> = {}): StoreProduct {
  return {
    id: 'product-1',
    title: 'Test Product',
    imageUrl: '',
    platformLabel: 'PC',
    platformTone: 'pc',
    priceUsd: 10,
    cta: 'cart',
    outOfStock: false,
    ...overrides,
  };
}

describe('applyStorefrontEnrichment', () => {
  it('keeps "cart" and reports in-stock when a purchasable variant exists', () => {
    const config = configuration([variant({ availableStock: 5, price: 9.5 })]);

    const enriched = applyStorefrontEnrichment(rawProduct(), config);

    expect(enriched.cta).toBe('cart');
    expect(enriched.outOfStock).toBe(false);
    expect(enriched.stockStatus).toBe('in-stock');
    expect(enriched.priceUsd).toBe(9.5);
  });

  it('forces "notify-me" when every variant is out of stock, even though the raw product looked purchasable', () => {
    const config = configuration([
      variant({ id: 'v1', availableStock: 0, isOutOfStock: true }),
      variant({ id: 'v2', availableStock: 0, isOutOfStock: true }),
    ]);
    // Raw product guessed "cart" purely from publish status — this is the exact bug: without
    // enrichment, an out-of-stock product still renders "Add to Cart".
    const raw = rawProduct({ cta: 'cart', outOfStock: false });

    const enriched = applyStorefrontEnrichment(raw, config);

    expect(enriched.cta).toBe('notify-me');
    expect(enriched.outOfStock).toBe(true);
    expect(enriched.stockStatus).toBe('out-of-stock');
    expect(enriched.directVariantId).toBeNull();
  });

  it('never shows "notify-me" for a product with at least one purchasable variant among several', () => {
    const config = configuration([
      variant({ id: 'v1', availableStock: 0, isOutOfStock: true }),
      variant({ id: 'v2', availableStock: 3, isOutOfStock: false }),
    ]);

    const enriched = applyStorefrontEnrichment(rawProduct(), config);

    expect(enriched.cta).toBe('cart');
    expect(enriched.outOfStock).toBe(false);
  });

  it('falls back to the raw guess when no configuration has loaded yet', () => {
    const raw = rawProduct({ cta: 'notify-me', outOfStock: true, priceUsd: 12 });

    const enriched = applyStorefrontEnrichment(raw, null);

    expect(enriched.cta).toBe('notify-me');
    expect(enriched.priceUsd).toBe(12);
    expect(enriched.stockStatus).toBe('out-of-stock');
  });

  it('resolves directVariantId only for a single implicit purchasable variant, never an out-of-stock one', () => {
    const config = configuration([variant({ id: 'only-variant', availableStock: 2, optionIds: [] })]);

    const enriched = applyStorefrontEnrichment(rawProduct(), config);

    expect(enriched.directVariantId).toBe('only-variant');
  });

  it('reports notify-me/out-of-stock when the only variants with stock are incomplete combinations (reported bug)', () => {
    // Reported scenario: "Global" (5 in stock) and "US" (3 in stock) never got the product's
    // later-added required "Value" option group, so the picker can never resolve either of them —
    // only "US + Value=100" is a complete combination, and it's out of stock. The card must not
    // show "Add to Cart"/"in stock" for a product with no reachable purchasable combination.
    const config = configuration([
      variant({ id: 'global', availableStock: 5, isOutOfStock: false, isCompleteCombination: false }),
      variant({ id: 'us', availableStock: 3, isOutOfStock: false, isCompleteCombination: false }),
      variant({ id: 'us-100', availableStock: 0, isOutOfStock: true, isCompleteCombination: true }),
    ]);

    const enriched = applyStorefrontEnrichment(rawProduct(), config);

    expect(enriched.cta).toBe('notify-me');
    expect(enriched.outOfStock).toBe(true);
    expect(enriched.stockStatus).toBe('out-of-stock');
  });

  it('treats a supplier-fulfilled variant (0 manual stock, isOutOfStock=false) as purchasable, not out of stock', () => {
    // Regression test: a SupplierOnly/SupplierFirst variant fulfilled by a READY automated supplier
    // has no manual DigitalInventoryCode count, so availableStock stays 0 even though the backend
    // has already blended supplier readiness into isOutOfStock. availableStock must not gate here.
    const config = configuration([variant({ availableStock: 0, isOutOfStock: false })]);

    const enriched = applyStorefrontEnrichment(rawProduct(), config);

    expect(enriched.cta).toBe('cart');
    expect(enriched.outOfStock).toBe(false);
    expect(enriched.stockStatus).toBe('in-stock');
  });
});

describe('applyStorefrontEnrichment old price', () => {
  it('shows the cheapest variant\'s old price struck through, with the discount in whole percent', () => {
    const config = configuration([
      variant({ id: 'v1', price: 8, comparePrice: 10 }),
      variant({ id: 'v2', price: 20, comparePrice: 100 }),
    ]);

    const enriched = applyStorefrontEnrichment(rawProduct({ priceUsd: 20 }), config);

    // The card shows the cheapest price (8), so its old price (10 -> "-20%") is the one that belongs to it.
    expect(enriched.priceUsd).toBe(8);
    expect(enriched.originalPriceUsd).toBe(10);
    expect(enriched.discountPercent).toBe(20);
  });

  it('shows no old price when the variant has none, or when it is not higher than the price', () => {
    const none = applyStorefrontEnrichment(rawProduct(), configuration([variant({ price: 10, comparePrice: null })]));
    const same = applyStorefrontEnrichment(rawProduct(), configuration([variant({ price: 10, comparePrice: 10 })]));
    const lower = applyStorefrontEnrichment(rawProduct(), configuration([variant({ price: 10, comparePrice: 5 })]));

    for (const enriched of [none, same, lower]) {
      expect(enriched.originalPriceUsd).toBeUndefined();
      expect(enriched.discountPercent).toBeUndefined();
    }
  });

  it('ignores the old price of a variant that cannot be bought (out of stock)', () => {
    const config = configuration([
      variant({ id: 'out', price: 1, comparePrice: 50, availableStock: 0, isOutOfStock: true }),
      variant({ id: 'in', price: 9, comparePrice: null }),
    ]);

    const enriched = applyStorefrontEnrichment(rawProduct(), config);

    expect(enriched.priceUsd).toBe(9);
    expect(enriched.originalPriceUsd).toBeUndefined();
  });

  it('never rounds a real discount down to nothing', () => {
    const config = configuration([variant({ price: 9.99, comparePrice: 10 })]);

    expect(applyStorefrontEnrichment(rawProduct(), config).discountPercent).toBe(1);
  });

  it('quotes the lowest real variant price (never the parent 0) when nothing can be bought right now', () => {
    const config = configuration(
      [
        variant({ id: 'v1', price: 0, isOutOfStock: true }),
        variant({ id: 'v2', price: 12, isOutOfStock: true }),
        variant({ id: 'v3', price: 9, isCompleteCombination: false }),
      ],
      { basePrice: 0 },
    );

    const enriched = applyStorefrontEnrichment(rawProduct({ priceUsd: 0 }), config);

    expect(enriched.outOfStock).toBe(true);
    expect(enriched.priceUsd).toBe(9);
  });

  it('keeps the base price when no variant has a real price at all', () => {
    const config = configuration([variant({ price: 0, isOutOfStock: true })], { basePrice: 0 });

    expect(applyStorefrontEnrichment(rawProduct({ priceUsd: 0 }), config).priceUsd).toBe(0);
  });

  it('a parent product quotes the lowest variant price, offers Explore options and never reads as out of stock', () => {
    const config = configuration(
      [
        variant({ id: 'v1', price: 0, isOutOfStock: true }),
        variant({ id: 'v2', price: 15, isOutOfStock: true }),
        variant({ id: 'v3', price: 12, isOutOfStock: true }),
      ],
      { basePrice: 0, optionGroups: [] },
    );

    const enriched = applyStorefrontEnrichment(rawProduct({ priceUsd: 0, isParent: true, cta: 'explore' }), config);

    expect(enriched.cta).toBe('explore');
    expect(enriched.outOfStock).toBe(false);
    expect(enriched.priceUsd).toBe(12);
    expect(enriched.directVariantId).toBeNull();
  });
});

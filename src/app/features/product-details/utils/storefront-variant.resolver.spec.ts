import { describe, expect, it } from 'vitest';

import { StorefrontProductConfigurationDto, StorefrontVariantDto } from '../../catalog/models/inventory-api.model';
import { defaultSelections, repairSelections, resolveVariant } from './storefront-variant.resolver';

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
  return { productId: 'product-1', basePrice: 10, optionGroups: [], variants, ...{} };
}

describe('storefront-variant.resolver', () => {
  it('resolves a supplier-fulfilled variant (0 manual stock, isOutOfStock=false) as purchasable', () => {
    // Regression test for the reported bug: a SupplierOnly/SupplierFirst variant with a READY
    // automated supplier has no manual DigitalInventoryCode count, so availableStock legitimately
    // stays 0 even though the backend already reports it purchasable via isOutOfStock=false.
    const config = configuration([variant({ availableStock: 0, isOutOfStock: false })]);

    const resolved = resolveVariant(config, {});

    expect(resolved.variant).not.toBeNull();
    expect(resolved.isOutOfStock).toBe(false);
    expect(resolved.availableStock).toBe(0);
  });

  it('still resolves a genuinely out-of-stock (manual, unmapped) variant as unpurchasable', () => {
    const config = configuration([variant({ availableStock: 0, isOutOfStock: true })]);

    const resolved = resolveVariant(config, {});

    expect(resolved.isOutOfStock).toBe(true);
  });

  it('defaultSelections prefers the supplier-fulfilled purchasable variant over an out-of-stock one', () => {
    const config = {
      productId: 'product-1',
      basePrice: 10,
      optionGroups: [
        {
          id: 'group-1',
          productId: 'product-1',
          parentOptionId: null,
          key: 'region',
          displayName: 'Region',
          sortOrder: 0,
          isRequired: true,
          options: [
            { id: 'opt-oos', optionGroupId: 'group-1', value: 'us', label: 'US', sortOrder: 0, descriptionHtml: null },
            { id: 'opt-supplier', optionGroupId: 'group-1', value: 'global', label: 'Global', sortOrder: 1, descriptionHtml: null },
          ],
        },
      ],
      variants: [
        variant({ id: 'v-oos', availableStock: 0, isOutOfStock: true, optionIds: ['opt-oos'] }),
        variant({ id: 'v-supplier', availableStock: 0, isOutOfStock: false, optionIds: ['opt-supplier'] }),
      ],
    } satisfies StorefrontProductConfigurationDto;

    const selections = defaultSelections(config);

    expect(selections['group-1']).toBe('opt-supplier');
  });
});

describe('picking an option (repairSelections)', () => {
  const group = (id: string, optionIds: string[], extra: object = {}) => ({
    id, productId: 'p', parentOptionId: null, key: id, displayName: id, sortOrder: 0, isRequired: true,
    options: optionIds.map((o) => ({ id: o, label: o, value: o, sortOrder: 0 })), ...extra,
  });
  const config = {
    productId: 'p',
    basePrice: 10,
    optionGroups: [group('edition', ['std', 'deluxe']), group('region', ['us', 'eu'])],
    variants: [
      variant({ id: 'v1', optionIds: ['std', 'us'] }),
      variant({ id: 'v2', optionIds: ['deluxe', 'eu'] }),
    ],
  } as unknown as StorefrontProductConfigurationDto;

  it('switches the other row to an option that fits instead of emptying it', () => {
    const next = repairSelections(config, { edition: 'std', region: 'us' }, 'edition', 'deluxe');

    expect(next).toEqual({ edition: 'deluxe', region: 'eu' });
    expect(resolveVariant(config, next).variant?.id).toBe('v2');
  });

  it('keeps a choice that still fits', () => {
    expect(repairSelections(config, { edition: 'std', region: 'us' }, 'region', 'us')).toEqual({ edition: 'std', region: 'us' });
  });

  it('ignores a hidden child row when matching the variant', () => {
    const withChild = {
      productId: 'p',
      basePrice: 10,
      optionGroups: [
        group('platform', ['xbox', 'psn']),
        group('account', ['full'], { parentOptionId: 'xbox' }),
      ],
      variants: [variant({ id: 'x', optionIds: ['xbox', 'full'] }), variant({ id: 'p', optionIds: ['psn'] })],
    } as unknown as StorefrontProductConfigurationDto;

    const next = repairSelections(withChild, { platform: 'xbox', account: 'full' }, 'platform', 'psn');

    expect(next).toEqual({ platform: 'psn' });
    expect(resolveVariant(withChild, next).variant?.id).toBe('p');
  });
});

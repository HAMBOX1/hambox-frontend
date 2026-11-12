import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { TranslationService } from '../../core/i18n/translation.service';
import { StorefrontProductConfigurationDto } from '../../features/catalog/models/inventory-api.model';
import { CategoryApiService } from '../../features/catalog/services/category-api.service';
import { InventoryApiService } from '../../features/catalog/services/inventory-api.service';
import { Products } from '../../features/products/services/products';
import { StorefrontSearchService } from './storefront-search.service';

const PS_PLUS = 'ps-plus';

function configuration(): StorefrontProductConfigurationDto {
  const option = (id: string, groupId: string, label: string) => ({
    id,
    optionGroupId: groupId,
    value: label.toLowerCase(),
    label,
    sortOrder: 0,
  });
  const group = (id: string, displayName: string, options: ReturnType<typeof option>[]) => ({
    id,
    productId: PS_PLUS,
    parentOptionId: null,
    key: displayName.toLowerCase(),
    displayName,
    sortOrder: 0,
    isRequired: true,
    options,
  });
  const variant = (id: string, optionIds: string[], isOutOfStock = false) => ({
    id,
    sku: `PS-${id}`,
    price: 10,
    comparePrice: null,
    availableStock: isOutOfStock ? 0 : 5,
    isLowStock: false,
    isOutOfStock,
    optionIds,
    isCompleteCombination: true,
  });

  return {
    productId: PS_PLUS,
    basePrice: 10,
    optionGroups: [
      group('g-tier', 'Tier', [option('o-ess', 'g-tier', 'Essential'), option('o-ext', 'g-tier', 'Extra')]),
      group('g-term', 'Term', [option('o-1m', 'g-term', '1 Month'), option('o-3m', 'g-term', '3 Months')]),
    ],
    variants: [
      variant('v1', ['o-ess', 'o-1m']),
      variant('v2', ['o-ess', 'o-3m'], true),
      variant('v3', ['o-ext', 'o-1m']),
    ],
  };
}

function setup(configs: () => unknown) {
  const product = { id: PS_PLUS, nameEn: 'Playstation Plus Membership', nameAr: '', status: 'Active', categoryName: 'Playstation' };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: Products, useValue: { getActiveProducts: async () => ({ items: [product] }), getCategoryPills: async () => [] } },
      { provide: CategoryApiService, useValue: {} },
      { provide: InventoryApiService, useValue: { getStorefrontConfigurations: configs } },
      { provide: TranslationService, useValue: { language: () => 'en' } },
    ],
  });
  localStorage.clear();
  return TestBed.inject(StorefrontSearchService);
}

describe('StorefrontSearchService variants', () => {
  it('lists the variants that the typed word points at, right under their product', async () => {
    const service = setup(() => of([configuration()]));

    const suggestions = await service.getSuggestions('Essential');

    expect(suggestions.map((s) => s.type)).toEqual(['product', 'variant', 'variant']);
    expect(suggestions[1].label).toBe('Playstation Plus Membership — Essential · 1 Month');
    expect(suggestions[1].route).toBe(`/products/${PS_PLUS}?variant=v1`);
    expect(suggestions[2].label).toContain('Essential · 3 Months');
    expect(suggestions[2].subtitle).toBe('Out of stock');
  });

  it('does not list variants when the word only matches the product name', async () => {
    const service = setup(() => of([configuration()]));

    const suggestions = await service.getSuggestions('Playstation');

    expect(suggestions.map((s) => s.type)).toEqual(['product']);
  });

  it('still shows the products when the variants request fails', async () => {
    const service = setup(() => throwError(() => new Error('down')));

    const suggestions = await service.getSuggestions('Essential');

    expect(suggestions.map((s) => s.type)).toEqual(['product']);
  });
});

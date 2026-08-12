import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';

import { StorefrontProductConfigurationDto } from '../../catalog/models/inventory-api.model';
import { InventoryApiService } from '../../catalog/services/inventory-api.service';
import { StorefrontProductEnrichmentService } from './storefront-product-enrichment.service';

function configFor(productId: string): StorefrontProductConfigurationDto {
  return { productId, basePrice: 10, optionGroups: [], variants: [] };
}

describe('StorefrontProductEnrichmentService', () => {
  let service: StorefrontProductEnrichmentService;
  let api: { getStorefrontConfigurations: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = { getStorefrontConfigurations: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        StorefrontProductEnrichmentService,
        { provide: InventoryApiService, useValue: api },
      ],
    });

    service = TestBed.inject(StorefrontProductEnrichmentService);
  });

  it('issues a single bulk request for a whole page of product ids, not one per product', async () => {
    const ids = Array.from({ length: 24 }, (_, i) => `product-${i}`);
    api.getStorefrontConfigurations.mockReturnValue(of(ids.map(configFor)));

    await service.ensureLoaded(ids);

    expect(api.getStorefrontConfigurations).toHaveBeenCalledTimes(1);
    expect(api.getStorefrontConfigurations).toHaveBeenCalledWith(ids);
    for (const id of ids) {
      expect(service.getConfiguration(id)).toEqual(configFor(id));
    }
  });

  it('does not re-fetch ids that are already cached', async () => {
    api.getStorefrontConfigurations.mockReturnValue(of([configFor('product-1')]));
    await service.ensureLoaded(['product-1']);

    api.getStorefrontConfigurations.mockReturnValue(of([configFor('product-2')]));
    await service.ensureLoaded(['product-1', 'product-2']);

    expect(api.getStorefrontConfigurations).toHaveBeenCalledTimes(2);
    expect(api.getStorefrontConfigurations).toHaveBeenLastCalledWith(['product-2']);
  });

  it('clears the loading state even if the bulk request fails', async () => {
    api.getStorefrontConfigurations.mockReturnValue(throwError(() => new Error('network')));

    await expect(service.ensureLoaded(['product-1'])).rejects.toThrow('network');

    expect(service.loadingIds().has('product-1')).toBe(false);
  });
});

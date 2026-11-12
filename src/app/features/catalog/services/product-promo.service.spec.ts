import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ApiClientService } from '../../../core/api/api-client.service';
import { ProductPromoService } from './product-promo.service';

interface Call {
  readonly method: 'get' | 'post';
  readonly path: string;
  readonly body?: unknown;
}

function setup(responses: Record<string, unknown> = {}) {
  const calls: Call[] = [];
  const api = {
    get: (path: string, options?: unknown) => {
      calls.push({ method: 'get', path, body: options });
      return of(responses[path] ?? { items: [] });
    },
    post: (path: string, body?: unknown) => {
      calls.push({ method: 'post', path, body });
      return of(responses[path] ?? {});
    },
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [{ provide: ApiClientService, useValue: api }] });
  return { service: TestBed.inject(ProductPromoService), calls };
}

describe('ProductPromoService', () => {
  it('lists the promo-code promotions and leaves archived ones out', async () => {
    const { service } = setup({
      '/api/v1/promotions': {
        items: [
          { id: '1', name: 'SUMMER10', status: 'Active' },
          { id: '2', name: 'OLD', status: 'Archived' },
          { id: '3', name: 'DRAFTY', status: 'Draft' },
        ],
      },
    });

    const list = await service.listCodePromotions();

    expect(list.map((p) => p.id)).toEqual(['1', '3']);
  });

  it('attaches products and categories to an existing code in one request', async () => {
    const { service, calls } = setup({
      '/api/v1/promotions/p1/targets': { productsAdded: 2, categoriesAdded: 0, alreadyTargeted: 1 },
    });

    const result = await service.addTargets('p1', { productIds: ['a', 'b', 'c'], categoryIds: [] });

    expect(result.productsAdded).toBe(2);
    expect(calls).toHaveLength(1);
    expect(calls[0].body).toEqual({ productIds: ['a', 'b', 'c'], categoryIds: [] });
  });

  it('creates a new code aimed at the products and publishes it so it works straight away', async () => {
    const { service, calls } = setup({ '/api/v1/promotions': { id: 'new-1' } });

    const result = await service.createCode(
      { code: 'SUMMER10', discountType: 'Percentage', discountValue: 10 },
      { productIds: ['a'], categoryIds: ['c1'] },
      true,
    );

    const create = calls[0].body as { name: string; type: string; initialCouponCode: string; targets: { type: string; targetId: string }[] };
    expect(create.type).toBe('CouponCode');
    expect(create.initialCouponCode).toBe('SUMMER10');
    expect(create.targets).toEqual([
      { type: 'Product', targetId: 'a' },
      { type: 'Category', targetId: 'c1' },
    ]);
    expect(calls[1].path).toBe('/api/v1/promotions/new-1/publish');
    expect(result.productsAdded).toBe(1);
  });

  it('leaves a new code as a draft when the admin may not publish', async () => {
    const { service, calls } = setup({ '/api/v1/promotions': 'new-2' });

    await service.createCode({ code: 'X10', discountType: 'FixedAmount', discountValue: 5 }, { productIds: ['a'], categoryIds: [] }, false);

    expect(calls).toHaveLength(1);
  });
});

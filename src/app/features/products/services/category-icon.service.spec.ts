import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ApiClientService } from '../../../core/api/api-client.service';
import { ProductCouponService } from '../../../core/promotions/product-coupon.service';
import { CategoryIconService } from './category-icon.service';

function setup(get: (url: string, options?: unknown) => unknown) {
  TestBed.configureTestingModule({ providers: [{ provide: ApiClientService, useValue: { get } }] });
}

describe('CategoryIconService', () => {
  it('gives a category its icon once the list has loaded, and none to a category without one', async () => {
    const get = vi.fn(() =>
      of({ items: [{ id: 'steam', iconUrl: '/uploads/steam.svg' }, { id: 'plain', iconUrl: null }] }),
    );
    setup(get);
    const service = TestBed.inject(CategoryIconService);

    expect(service.iconFor('steam')).toBeNull();
    await Promise.resolve();
    await Promise.resolve();

    expect(service.iconFor('steam')).toBe('/uploads/steam.svg');
    expect(service.iconFor('plain')).toBeNull();
    expect(service.iconFor(undefined)).toBeNull();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('leaves the cards without icons when the list cannot be loaded', async () => {
    setup(() => throwError(() => new Error('offline')));
    const service = TestBed.inject(CategoryIconService);

    service.iconFor('steam');
    await Promise.resolve();
    await Promise.resolve();

    expect(service.iconFor('steam')).toBeNull();
  });
});

describe('ProductCouponService', () => {
  it('asks for the codes of one product and its category', async () => {
    const get = vi.fn(() => of([{ code: 'IAMSMART2', discountType: 'Percentage', discountValue: 20 }]));
    setup(get);

    const codes = await TestBed.inject(ProductCouponService).forProduct('p-1', 'c-1');

    expect(codes).toEqual([{ code: 'IAMSMART2', discountType: 'Percentage', discountValue: 20 }]);
    expect(get).toHaveBeenCalledWith('/api/v1/promotions/product-coupons', { params: { productId: 'p-1', categoryId: 'c-1' } });
  });

  it('shows no codes when the request fails', async () => {
    setup(() => throwError(() => new Error('offline')));

    expect(await TestBed.inject(ProductCouponService).forProduct('p-1')).toEqual([]);
  });
});

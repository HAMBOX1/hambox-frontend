import { TestBed } from '@angular/core/testing';

import { ProductTableColumnsService } from './product-table-columns.service';

const ORDER_KEY = 'hambox.admin.products.columns.order';

function createService(): ProductTableColumnsService {
  TestBed.resetTestingModule();
  return TestBed.inject(ProductTableColumnsService);
}

describe('ProductTableColumnsService column order', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('starts in the default order and lists only visible columns', () => {
    const service = createService();

    expect(service.order()[0]).toBe('stock');
    expect(service.orderedVisible()).not.toContain('costPrice');
  });

  it('moves a column one step and remembers it', () => {
    const service = createService();
    service.setVisible('costPrice', true);

    service.move('costPrice', -1);

    const order = service.order();
    expect(order.indexOf('costPrice')).toBe(order.indexOf('salePrice') - 1);
    expect(JSON.parse(localStorage.getItem(ORDER_KEY) ?? '[]')).toEqual([...order]);
    // A new service instance (a page reload) picks the saved order up again.
    expect(createService().order()).toEqual(order);
  });

  it('cannot move the first column left or the last column right', () => {
    const service = createService();
    const first = service.order()[0];
    const last = service.order()[service.order().length - 1];

    expect(service.canMove(first, -1)).toBe(false);
    expect(service.canMove(last, 1)).toBe(false);
    expect(service.canMove(first, 1)).toBe(true);
  });

  it('keeps a hidden column in its slot so showing it again restores the place', () => {
    const service = createService();
    service.setVisible('costPrice', true);
    service.move('costPrice', -1);
    const before = service.orderedVisible().indexOf('costPrice');

    service.setVisible('costPrice', false);
    service.setVisible('costPrice', true);

    expect(service.orderedVisible().indexOf('costPrice')).toBe(before);
  });

  it('appends columns missing from a saved order and drops unknown ones', () => {
    localStorage.setItem(ORDER_KEY, JSON.stringify(['status', 'nonsense', 'stock']));

    const service = createService();

    expect(service.order().slice(0, 2)).toEqual(['status', 'stock']);
    expect(service.order()).not.toContain('nonsense' as never);
    expect(new Set(service.order()).size).toBe(service.definitions.length);
  });

  it('resets both visibility and order to the defaults', () => {
    const service = createService();
    service.move('stock', 1);

    service.resetToDefaults();

    expect(service.order()[0]).toBe('stock');
  });
});

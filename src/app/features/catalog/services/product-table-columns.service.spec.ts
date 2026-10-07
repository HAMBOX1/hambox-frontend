import { TestBed } from '@angular/core/testing';

import { PRODUCT_TABLE_COLUMNS, ProductTableColumnsService } from './product-table-columns.service';

const STORAGE_KEY = 'hambox.admin.products.columns';

describe('ProductTableColumnsService — Products table column configurability', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    TestBed.resetTestingModule();
  });

  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it('starts with the documented defaults on a fresh session (no saved state)', () => {
    const service = TestBed.inject(ProductTableColumnsService);

    for (const def of PRODUCT_TABLE_COLUMNS) {
      expect(service.isVisible(def.id)).toBe(def.defaultVisible);
    }
  });

  it('hides a column, shows another, and persists both to localStorage', () => {
    const service = TestBed.inject(ProductTableColumnsService);

    service.setVisible('category', false);
    service.setVisible('sku', true);

    expect(service.isVisible('category')).toBe(false);
    expect(service.isVisible('sku')).toBe(true);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as string[];
    expect(stored).toContain('sku');
    expect(stored).not.toContain('category');
  });

  /**
   * Regression cover mirroring the Products-list navigation-state fix: the table component (and
   * therefore anything that merely re-injects this root-scoped service) is destroyed and recreated
   * by the router on a Products → Edit → Products round trip. Column visibility must survive that
   * exactly like the list's tab/page/sort/filters do.
   */
  it('preserves a custom column set across what would be a page-component recreation', () => {
    const beforeNavigatingAway = TestBed.inject(ProductTableColumnsService);
    beforeNavigatingAway.setVisible('status', false);
    beforeNavigatingAway.setVisible('sku', true);
    beforeNavigatingAway.setVisible('costPrice', true);
    beforeNavigatingAway.setVisible('margin', true);

    const afterReturning = TestBed.inject(ProductTableColumnsService);

    expect(afterReturning).toBe(beforeNavigatingAway);
    expect(afterReturning.isVisible('status')).toBe(false);
    expect(afterReturning.isVisible('sku')).toBe(true);
    expect(afterReturning.isVisible('costPrice')).toBe(true);
    expect(afterReturning.isVisible('margin')).toBe(true);
  });

  it('survives a full reload via localStorage (a brand-new injector, not just a new component)', () => {
    const firstSession = TestBed.inject(ProductTableColumnsService);
    firstSession.setVisible('supplier', false);
    firstSession.setVisible('margin', true);

    // Simulates a hard page refresh: an entirely new root injector, same browser/localStorage.
    TestBed.resetTestingModule();
    const secondSession = TestBed.inject(ProductTableColumnsService);

    expect(secondSession.isVisible('supplier')).toBe(false);
    expect(secondSession.isVisible('margin')).toBe(true);
  });

  it('resets to the documented defaults and persists the reset', () => {
    const service = TestBed.inject(ProductTableColumnsService);
    service.setVisible('category', false);
    service.setVisible('sku', true);

    service.resetToDefaults();

    for (const def of PRODUCT_TABLE_COLUMNS) {
      expect(service.isVisible(def.id)).toBe(def.defaultVisible);
    }

    // The reset must itself be persisted, not just applied in memory.
    TestBed.resetTestingModule();
    const afterReload = TestBed.inject(ProductTableColumnsService);
    for (const def of PRODUCT_TABLE_COLUMNS) {
      expect(afterReload.isVisible(def.id)).toBe(def.defaultVisible);
    }
  });

  it('ignores a stale column id from an older release instead of resetting everything to defaults', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['sku', 'some-removed-column']));

    const service = TestBed.inject(ProductTableColumnsService);

    expect(service.isVisible('sku')).toBe(true);
    expect(service.isVisible('stock')).toBe(false); // not in the stored set, so hidden — not defaulted back on
  });
});

import { pickRotated } from '../../services/section-product-source.service';
import { DEFAULT_SECTION_COMMON, readSectionCommon } from './section-common.model';

describe('readSectionCommon', () => {
  it('returns the defaults when a section has no _common options', () => {
    expect(readSectionCommon({})).toEqual(DEFAULT_SECTION_COMMON);
    expect(readSectionCommon(null)).toEqual(DEFAULT_SECTION_COMMON);
    expect(readSectionCommon({ _common: 'nonsense' })).toEqual(DEFAULT_SECTION_COMMON);
  });

  it('reads heading style and the button, trimming and capping what an admin typed', () => {
    const common = readSectionCommon({
      _common: { titleFontSize: 400, titleColor: ' #ff0000 ', buttonLabel: ' View all ', buttonUrl: '/products', buttonAlign: 'end' },
    });

    expect(common.titleFontSize).toBe(96);
    expect(common.titleColor).toBe('#ff0000');
    expect(common.buttonLabel).toBe('View all');
    expect(common.buttonUrl).toBe('/products');
    expect(common.buttonAlign).toBe('end');
  });

  it('ignores a zero or invalid heading size so the design default stays', () => {
    expect(readSectionCommon({ _common: { titleFontSize: 0 } }).titleFontSize).toBeNull();
    expect(readSectionCommon({ _common: { titleFontSize: 'big' } }).titleFontSize).toBeNull();
  });

  it('normalises the products source, clamping the limit and dropping bad ids', () => {
    const common = readSectionCommon({
      _common: {
        products: { source: 'category', categoryIds: ['a', 7, 'b'], limit: 99, rotation: 'daily', productIds: [], collectionId: '' },
      },
    });

    expect(common.products).toEqual({
      source: 'category',
      productIds: [],
      categoryIds: ['a', 'b'],
      collectionId: null,
      limit: 24,
      rotation: 'daily',
    });
  });

  it('falls back to the default source for an unknown one', () => {
    expect(readSectionCommon({ _common: { products: { source: 'whatever', limit: 4 } } }).products?.source).toBe('auto');
  });
});

describe('pickRotated', () => {
  const pool = Array.from({ length: 100 }, (_, i) => i);

  it('keeps the first ones when there is no rotation', () => {
    expect(pickRotated(pool, 4, 'none')).toEqual([0, 1, 2, 3]);
  });

  it('shows everything when the pool is not bigger than the limit', () => {
    expect(pickRotated([1, 2, 3], 4, 'daily')).toEqual([1, 2, 3]);
  });

  it('shows the same set all day but a different one tomorrow', () => {
    const morning = new Date('2026-10-28T06:00:00Z');
    const evening = new Date('2026-10-28T22:00:00Z');
    const tomorrow = new Date('2026-10-29T06:00:00Z');

    const today = pickRotated(pool, 4, 'daily', morning);

    expect(pickRotated(pool, 4, 'daily', evening)).toEqual(today);
    expect(pickRotated(pool, 4, 'daily', tomorrow)).not.toEqual(today);
    expect(today).toHaveLength(4);
    expect(new Set(today).size).toBe(4);
  });

  it('never repeats a product within one pick', () => {
    const picked = pickRotated(pool, 12, 'random');

    expect(picked).toHaveLength(12);
    expect(new Set(picked).size).toBe(12);
  });
});

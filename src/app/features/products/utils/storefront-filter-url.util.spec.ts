import { decodeFiltersParam, encodeFiltersParam } from './storefront-filter-url.util';

describe('storefront filter share link', () => {
  it('round-trips the chosen filters', () => {
    const filters = { minPrice: 5, maxPrice: 40, inStockOnly: true, attributes: { region: ['us', 'uk'], 'game-mode': ['multiplayer'] } };

    expect(decodeFiltersParam(encodeFiltersParam(filters))).toEqual(filters);
  });

  it('has no value at all when nothing is chosen', () => {
    expect(encodeFiltersParam({ minPrice: null, maxPrice: null, inStockOnly: false, attributes: { region: [] } })).toBeNull();
  });

  it('treats a broken or hand-edited value as no filters', () => {
    const none = { minPrice: null, maxPrice: null, inStockOnly: false, attributes: {} };

    expect(decodeFiltersParam('{not json')).toEqual(none);
    expect(decodeFiltersParam(null)).toEqual(none);
    expect(decodeFiltersParam(JSON.stringify({ a: { region: 'us' }, min: -3, max: 'x' }))).toEqual(none);
  });
});

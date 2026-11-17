import { StorefrontClientFilters } from '../services/products.facade';

const EMPTY: StorefrontClientFilters = { minPrice: null, maxPrice: null, inStockOnly: false, attributes: {} };

/** The chosen filters as one short, shareable query value (null when nothing is chosen). */
export function encodeFiltersParam(filters: StorefrontClientFilters): string | null {
  const attributes = Object.fromEntries(Object.entries(filters.attributes).filter(([, values]) => values.length > 0));
  const payload: Record<string, unknown> = {};
  if (Object.keys(attributes).length > 0) {
    payload['a'] = attributes;
  }
  if (filters.minPrice !== null) {
    payload['min'] = filters.minPrice;
  }
  if (filters.maxPrice !== null) {
    payload['max'] = filters.maxPrice;
  }
  if (filters.inStockOnly) {
    payload['s'] = 1;
  }

  return Object.keys(payload).length === 0 ? null : JSON.stringify(payload);
}

/** Reads a shared filters value back; anything unreadable simply means "no filters". */
export function decodeFiltersParam(value: string | null): StorefrontClientFilters {
  if (!value) {
    return EMPTY;
  }

  try {
    const raw = JSON.parse(value) as { a?: Record<string, unknown>; min?: unknown; max?: unknown; s?: unknown };
    const attributes: Record<string, string[]> = {};
    for (const [key, values] of Object.entries(raw.a ?? {})) {
      if (Array.isArray(values)) {
        const clean = values.filter((v): v is string => typeof v === 'string' && v.length > 0);
        if (clean.length > 0) {
          attributes[key] = clean;
        }
      }
    }

    const price = (input: unknown) => (typeof input === 'number' && Number.isFinite(input) && input >= 0 ? input : null);
    return { minPrice: price(raw.min), maxPrice: price(raw.max), inStockOnly: raw.s === 1, attributes };
  } catch {
    return EMPTY;
  }
}

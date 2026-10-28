/**
 * Options every landing-page section can carry, stored under the reserved `_common` key of the section's
 * own `configJson` so no section's config type, settings form or renderer has to change: the shared
 * `SectionRendererComponent` reads this and applies it around whatever the variant renders.
 */

export type SectionProductSource = 'auto' | 'manual' | 'category' | 'internal';
export type SectionProductRotation = 'none' | 'daily' | 'random';
export type SectionButtonAlign = 'start' | 'center' | 'end';

/** Where a Products section gets its items from, how many it shows and how they rotate. */
export interface SectionProductsConfig {
  /** `auto` keeps the platform's default featured set. */
  readonly source: SectionProductSource;
  /** Hand-picked products, shown in this order (`manual`). */
  readonly productIds: readonly string[];
  /** Pick from these categories (`category`). */
  readonly categoryIds: readonly string[];
  /** Pick from this internal category / collection (`internal`). */
  readonly collectionId: string | null;
  /** How many to show at once (e.g. 4 out of a category of 100). */
  readonly limit: number;
  /** With a larger pool than `limit`: keep the first ones, show a different set every day, or shuffle each visit. */
  readonly rotation: SectionProductRotation;
}

export interface SectionCommonConfig {
  /** Heading size in px; null/0 keeps the design default. */
  readonly titleFontSize: number | null;
  /** Heading colour (any CSS colour); null keeps the theme colour. */
  readonly titleColor: string | null;
  /** A call-to-action button under the section (e.g. "View all"); shown only when label and link are set. */
  readonly buttonLabel: string | null;
  readonly buttonUrl: string | null;
  readonly buttonAlign: SectionButtonAlign;
  readonly products: SectionProductsConfig | null;
}

export const DEFAULT_PRODUCTS_CONFIG: SectionProductsConfig = {
  source: 'auto',
  productIds: [],
  categoryIds: [],
  collectionId: null,
  limit: 4,
  rotation: 'none',
};

export const DEFAULT_SECTION_COMMON: SectionCommonConfig = {
  titleFontSize: null,
  titleColor: null,
  buttonLabel: null,
  buttonUrl: null,
  buttonAlign: 'center',
  products: null,
};

/** Reads `_common` out of a section's parsed config, tolerating anything an admin could have hand-edited in. */
export function readSectionCommon(config: unknown): SectionCommonConfig {
  const raw = (config as { _common?: Partial<SectionCommonConfig> } | null | undefined)?._common;
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_SECTION_COMMON;
  }

  const size = Number(raw.titleFontSize);
  const products = raw.products && typeof raw.products === 'object' ? raw.products : null;

  return {
    titleFontSize: Number.isFinite(size) && size > 0 ? Math.min(size, 96) : null,
    titleColor: typeof raw.titleColor === 'string' && raw.titleColor.trim() ? raw.titleColor.trim() : null,
    buttonLabel: typeof raw.buttonLabel === 'string' && raw.buttonLabel.trim() ? raw.buttonLabel.trim() : null,
    buttonUrl: typeof raw.buttonUrl === 'string' && raw.buttonUrl.trim() ? raw.buttonUrl.trim() : null,
    buttonAlign: raw.buttonAlign === 'start' || raw.buttonAlign === 'end' ? raw.buttonAlign : 'center',
    products: products
      ? {
          source: ['manual', 'category', 'internal'].includes(products.source as string)
            ? (products.source as SectionProductSource)
            : 'auto',
          productIds: Array.isArray(products.productIds) ? products.productIds.filter((id) => typeof id === 'string') : [],
          categoryIds: Array.isArray(products.categoryIds) ? products.categoryIds.filter((id) => typeof id === 'string') : [],
          collectionId: typeof products.collectionId === 'string' && products.collectionId ? products.collectionId : null,
          limit: Math.min(Math.max(Math.round(Number(products.limit)) || DEFAULT_PRODUCTS_CONFIG.limit, 1), 24),
          rotation: products.rotation === 'daily' || products.rotation === 'random' ? products.rotation : 'none',
        }
      : null,
  };
}

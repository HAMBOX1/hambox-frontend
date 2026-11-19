/**
 * Options every landing-page section can carry, stored under the reserved `_common` key of the section's
 * own `configJson` so no section's config type, settings form or renderer has to change: the shared
 * `SectionRendererComponent` reads this and applies it around whatever the variant renders.
 */

/** `categories` swaps the section's cards for category cards (the picked categories, or every active one). */
/** `all` draws from every active product of the store (newest first, or rotated); `auto` is the page's default featured set. */
export type SectionProductSource = 'auto' | 'manual' | 'category' | 'internal' | 'categories' | 'all';
export type SectionProductRotation = 'none' | 'daily' | 'random';
export type SectionButtonAlign = 'start' | 'center' | 'end';
/** Small / Medium match the site's usual buttons; Large matches the big hero buttons. */
export type SectionButtonSize = 'small' | 'medium' | 'large';
/** `close` tucks the button right under the section's content; `normal` leaves the section's own spacing. */
export type SectionButtonSpacing = 'close' | 'normal';
/**
 * `text` puts the button right under the section's heading text (like the hero button); `inside` puts it at the end of
 * the section's own content, inside the section; `bottom` after the whole section.
 */
export type SectionButtonPlacement = 'text' | 'inside' | 'bottom';
/** `heading` / `body` use the store's heading or body typeface for the section's text; `default` keeps the design's own. */
export type SectionFont = 'default' | 'heading' | 'body';
/** Filled button, an outline, or a soft tinted one. */
export type SectionButtonStyle = 'filled' | 'outline' | 'soft';
/** `auto` keeps the shape that goes with the chosen size. */
export type SectionButtonShape = 'auto' | 'pill' | 'rounded' | 'square';

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
  /** A picture used as the button instead of the filled button (the label is then its accessible name). */
  readonly buttonImageUrl: string | null;
  /** null = automatic: at the start under the heading text, centred at the bottom of the section. */
  readonly buttonAlign: SectionButtonAlign | null;
  readonly buttonSize: SectionButtonSize;
  readonly buttonSpacing: SectionButtonSpacing;
  readonly buttonPlacement: SectionButtonPlacement;
  readonly buttonStyle: SectionButtonStyle;
  readonly buttonShape: SectionButtonShape;
  /** The section's text (descriptions, paragraphs): size in px (null = design default), colour (null = theme) and typeface. */
  readonly textFontSize: number | null;
  readonly textColor: string | null;
  readonly fontFamily: SectionFont;
  /** The button's own text size in px (null = what the chosen size gives), its fill colour and its text colour (null = theme). */
  readonly buttonFontSize: number | null;
  readonly buttonColor: string | null;
  readonly buttonTextColor: string | null;
  /** A line of text written right above / below the button. */
  readonly buttonTextAbove: string | null;
  readonly buttonTextBelow: string | null;
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
  buttonImageUrl: null,
  buttonAlign: null,
  buttonSize: 'medium',
  buttonSpacing: 'close',
  buttonPlacement: 'text',
  buttonStyle: 'filled',
  buttonShape: 'auto',
  textFontSize: null,
  textColor: null,
  fontFamily: 'default',
  buttonFontSize: null,
  buttonColor: null,
  buttonTextColor: null,
  buttonTextAbove: null,
  buttonTextBelow: null,
  products: null,
};

/** Reads `_common` out of a section's parsed config, tolerating anything an admin could have hand-edited in. */
export function readSectionCommon(config: unknown): SectionCommonConfig {
  const raw = (config as { _common?: Partial<SectionCommonConfig> } | null | undefined)?._common;
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_SECTION_COMMON;
  }

  const size = Number(raw.titleFontSize);
  const textSize = Number(raw.textFontSize);
  const buttonFontSize = Number(raw.buttonFontSize);
  const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);
  const products = raw.products && typeof raw.products === 'object' ? raw.products : null;

  return {
    titleFontSize: Number.isFinite(size) && size > 0 ? Math.min(size, 96) : null,
    titleColor: typeof raw.titleColor === 'string' && raw.titleColor.trim() ? raw.titleColor.trim() : null,
    buttonLabel: typeof raw.buttonLabel === 'string' && raw.buttonLabel.trim() ? raw.buttonLabel.trim() : null,
    buttonUrl: typeof raw.buttonUrl === 'string' && raw.buttonUrl.trim() ? raw.buttonUrl.trim() : null,
    buttonImageUrl: typeof raw.buttonImageUrl === 'string' && raw.buttonImageUrl.trim() ? raw.buttonImageUrl.trim() : null,
    buttonAlign: raw.buttonAlign === 'start' || raw.buttonAlign === 'center' || raw.buttonAlign === 'end' ? raw.buttonAlign : null,
    buttonSize: raw.buttonSize === 'small' || raw.buttonSize === 'large' ? raw.buttonSize : 'medium',
    buttonSpacing: raw.buttonSpacing === 'normal' ? 'normal' : 'close',
    buttonPlacement: raw.buttonPlacement === 'bottom' || raw.buttonPlacement === 'inside' ? raw.buttonPlacement : 'text',
    buttonStyle: raw.buttonStyle === 'outline' || raw.buttonStyle === 'soft' ? raw.buttonStyle : 'filled',
    buttonShape:
      raw.buttonShape === 'pill' || raw.buttonShape === 'rounded' || raw.buttonShape === 'square' ? raw.buttonShape : 'auto',
    textFontSize: Number.isFinite(textSize) && textSize > 0 ? Math.min(textSize, 64) : null,
    textColor: text(raw.textColor),
    fontFamily: raw.fontFamily === 'heading' || raw.fontFamily === 'body' ? raw.fontFamily : 'default',
    buttonFontSize: Number.isFinite(buttonFontSize) && buttonFontSize > 0 ? Math.min(buttonFontSize, 48) : null,
    buttonColor: text(raw.buttonColor),
    buttonTextColor: text(raw.buttonTextColor),
    buttonTextAbove: text(raw.buttonTextAbove),
    buttonTextBelow: text(raw.buttonTextBelow),
    products: products
      ? {
          source: ['manual', 'category', 'internal', 'categories', 'all'].includes(products.source as string)
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

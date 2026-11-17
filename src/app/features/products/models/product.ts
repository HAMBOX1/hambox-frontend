export type StoreProductCta = 'cart' | 'buy-now' | 'notify-me';

export type StorePlatformTone = 'xbox' | 'psn' | 'pc' | 'nintendo';

export type StoreProductStockStatus = 'in-stock' | 'low-stock' | 'out-of-stock' | 'unknown';

export interface StoreProduct {
  id: string;
  title: string;
  imageUrl: string;
  platformLabel: string;
  platformTone: StorePlatformTone;
  categoryName?: string;
  rating?: number;
  discountLabel?: string;
  featuredBadge?: boolean;
  /** Per-product text chosen in the admin (e.g. "+3 Elite points"), in the viewer's language. */
  badgeText?: string;
  /** The colour (#rrggbb) the admin gave the note under the price; unset = the store's default. */
  badgeColor?: string;
  /** The category this product belongs to (its small icon, when it has one, shows on the card). */
  categoryId?: string;
  instantDigital?: boolean;
  originalPriceUsd?: number;
  /** The discount between the old (struck-through) price and the price shown, in whole percent (e.g. 20 = "-20%"). */
  discountPercent?: number;
  priceUsd: number;
  priceMuted?: boolean;
  cta: StoreProductCta;
  outOfStock?: boolean;
  stockStatus?: StoreProductStockStatus;
  highlighted?: boolean;
  createdOnUtc?: string;
  listIndex?: number;
  requiresOptionSelection?: boolean;
  directVariantId?: string | null;
  /** True only when a published Product-scoped marketing page exists — drives the card's "discover" icon. */
  hasMarketingPage?: boolean;
  /** Exclusive Products membership benefit — restricted regardless of whether the viewer qualifies. */
  isMembersOnly?: boolean;
  /** Early Access membership benefit — publicReleaseOnUtc is in the future and the viewer isn't within their lead window. */
  isComingSoon?: boolean;
}

export interface StoreCategoryPill {
  id: string;
  label: string;
  /** Category picture shown beside the name (Gamivo-style); absent for "All Items" and picture-less categories. */
  imageUrl?: string | null;
}

/** A category with its parent, for the Platform / Category picker. */
export interface StoreCategoryNode {
  id: string;
  parentId: string | null;
  label: string;
}

export interface StoreSortOption {
  value: string;
  label: string;
}

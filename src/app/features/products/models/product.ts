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
  instantDigital?: boolean;
  originalPriceUsd?: number;
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

export interface StoreSortOption {
  value: string;
  label: string;
}

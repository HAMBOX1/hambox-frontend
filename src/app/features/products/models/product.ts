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
}

export interface StoreCategoryPill {
  id: string;
  label: string;
}

export interface StoreSortOption {
  value: string;
  label: string;
}

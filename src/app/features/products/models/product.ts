export type StoreProductCta = 'cart' | 'buy-now' | 'notify-me';

export type StorePlatformTone = 'xbox' | 'psn' | 'pc' | 'nintendo';

export interface StoreProduct {
  id: string;
  title: string;
  imageUrl: string;
  platformLabel: string;
  platformTone: StorePlatformTone;
  rating?: number;
  discountLabel?: string;
  featuredBadge?: boolean;
  instantDigital?: boolean;
  originalPriceUsd?: number;
  priceUsd: number;
  priceMuted?: boolean;
  cta: StoreProductCta;
  outOfStock?: boolean;
  highlighted?: boolean;
}

export interface StoreCategoryPill {
  id: string;
  label: string;
}

export interface StorePlatformFilter {
  id: string;
  label: string;
  dotColor: string;
  checked: boolean;
}

export interface StoreSortOption {
  value: string;
  label: string;
}

export interface StorePromoBanner {
  headline: string;
  subheadline: string;
  backgroundImageUrl: string;
  initialCountdownSeconds: number;
}

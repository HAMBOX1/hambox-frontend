export type StorefrontPriceTone = 'green' | 'blue' | 'peach';

export interface NavLink {
  labelKey: string;
  route: string;
  active?: boolean;
}

export interface TrustFeature {
  iconSrc: string;
  titleKey: string;
  descriptionKey: string;
}

export interface StorefrontCategory {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  route: string;
}

export interface FlashDeal {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  discountLabel: string;
  originalPriceUsd: number;
  currentPriceUsd: number;
  priceTone: StorefrontPriceTone;
}

export interface TrendingRankItem {
  id: string;
  rank: string;
  rankTone: 'green' | 'blue';
  iconSrc: string;
  title: string;
  subtitle: string;
  priceUsd: number;
  priceTone: 'green' | 'blue';
  route: string;
}

export interface TrendingValueItem {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  priceUsd: number;
  route: string;
}

export interface StorefrontFeaturedProduct {
  id: string;
  badge: string;
  title: string;
  description: string;
  imageUrl: string;
  ctaLabel: string;
  route: string;
}

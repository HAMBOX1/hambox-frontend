import { Category } from '../../catalog/models/category.model';
import { Product } from '../../catalog/models/product.model';
import { StorefrontContent } from '../models/storefront-content.model';
import {
  FlashDeal,
  StorefrontCategory,
  StorefrontFeaturedProduct,
  StorefrontPriceTone,
  TrendingRankItem,
  TrendingValueItem,
} from '../models/storefront-home';

const PRODUCT_PLACEHOLDER_IMAGES = [
  'assets/images/placeholders/product.svg',
  'assets/images/categories/game-keys.svg',
  'assets/images/categories/gift-cards.svg',
  'assets/images/categories/subscriptions.svg',
  'assets/images/categories/top-ups.svg',
] as const;

const CATEGORY_PLACEHOLDER_IMAGE = 'assets/images/categories/game-keys.svg';

const PRICE_TONES: readonly StorefrontPriceTone[] = ['green', 'blue', 'peach'];
const RANK_TONES: Array<'green' | 'blue'> = ['green', 'blue'];

const CATEGORY_IMAGE_BY_SLUG: Readonly<Record<string, string>> = {
  'game-keys': 'assets/images/categories/game-keys.svg',
  'gift-cards': 'assets/images/categories/gift-cards.svg',
  subscriptions: 'assets/images/categories/subscriptions.svg',
  'top-ups': 'assets/images/categories/top-ups.svg',
  'account-top-ups': 'assets/images/categories/top-ups.svg',
};

export function productPlaceholderImage(index = 0): string {
  return PRODUCT_PLACEHOLDER_IMAGES[index % PRODUCT_PLACEHOLDER_IMAGES.length] ?? PRODUCT_PLACEHOLDER_IMAGES[0];
}

export function resolveStorefrontImageUrl(imageUrl?: string | null, fallback: string = PRODUCT_PLACEHOLDER_IMAGES[0]): string {
  if (!imageUrl?.trim()) {
    return fallback;
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  const normalized = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;

  return normalized
    .replace('deals/psn-card.jpg', 'placeholders/product.svg')
    .replace(/categories\/(.+)\.jpg$/, 'categories/$1.svg');
}

export function mapCategoryToStorefrontCategory(category: Category): StorefrontCategory {
  const normalizedSlug = category.slug.trim().toLowerCase();

  return {
    id: category.id,
    title: category.nameEn,
    subtitle: `Browse ${category.nameEn}`,
    imageUrl: CATEGORY_IMAGE_BY_SLUG[normalizedSlug] ?? CATEGORY_PLACEHOLDER_IMAGE,
    route: `/products?category=${category.id}`,
  };
}

export function mapProductToFlashDeal(product: Product, index: number): FlashDeal {
  return {
    id: product.id,
    title: product.nameEn,
    subtitle: product.categoryName,
    imageUrl: resolveStorefrontImageUrl(product.primaryImageUrl, productPlaceholderImage(index)),
    discountLabel: '',
    originalPriceUsd: product.price,
    currentPriceUsd: product.price,
    priceTone: PRICE_TONES[index % PRICE_TONES.length] ?? 'green',
  };
}

export function mapProductToTrendingRank(product: Product, index: number): TrendingRankItem {
  return {
    id: product.id,
    rank: `#${index + 1}`,
    rankTone: RANK_TONES[index % RANK_TONES.length] ?? 'green',
    iconSrc: resolveStorefrontImageUrl(product.primaryImageUrl, productPlaceholderImage(index)),
    title: product.nameEn,
    subtitle: product.categoryName,
    priceUsd: product.price,
    priceTone: RANK_TONES[index % RANK_TONES.length] ?? 'green',
    route: `/products/${product.id}`,
  };
}

export function mapProductToTrendingValue(product: Product): TrendingValueItem {
  return {
    id: product.id,
    badge: 'BEST VALUE',
    title: product.nameEn,
    subtitle: product.categoryName,
    priceUsd: product.price,
    route: `/products/${product.id}`,
  };
}

export function mapProductToFeaturedProduct(product: Product, index = 0): StorefrontFeaturedProduct {
  return {
    id: product.id,
    badge: "EDITOR'S CHOICE",
    title: product.nameEn,
    description: product.descriptionEn,
    imageUrl: resolveStorefrontImageUrl(product.primaryImageUrl, productPlaceholderImage(index)),
    ctaLabel: 'View Product',
    route: `/products/${product.id}`,
  };
}

export function mapStorefrontContent(response: StorefrontContent): StorefrontContent {
  return {
    ...response,
    hero: {
      ...response.hero,
      backgroundImageUrl: resolveStorefrontImageUrl(
        response.hero.backgroundImageUrl,
        'assets/images/hambox-hero-background.png',
      ),
      overlayImageUrl: resolveStorefrontImageUrl(
        response.hero.overlayImageUrl,
        'assets/images/hambox-hero-overlay.png',
      ),
    },
    promoBanner: {
      ...response.promoBanner,
      backgroundImageUrl: resolveStorefrontImageUrl(
        response.promoBanner.backgroundImageUrl,
        'assets/images/hambox-hero-background.png',
      ),
    },
  };
}

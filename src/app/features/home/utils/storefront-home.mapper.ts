import { Category } from '../../catalog/models/category.model';
import { Product } from '../../catalog/models/product.model';
import { resolveLocalizedText } from '../../../core/i18n/localized-text.util';
import { SupportedLanguageId } from '../../../core/i18n/locale.model';
import {
  StorefrontContent,
  StorefrontTrustItemContent,
} from '../models/storefront-content.model';
import {
  FlashDeal,
  StorefrontCategory,
  StorefrontFeaturedProduct,
  StorefrontPriceTone,
  TrendingRankItem,
  TrendingValueItem,
  TrustFeature,
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

export function mapCategoryToStorefrontCategory(
  category: Category,
  lang: SupportedLanguageId,
): StorefrontCategory {
  const name = resolveLocalizedText(category.nameEn, category.nameAr, lang);

  return {
    id: category.id,
    title: name,
    subtitle: `Browse ${name}`,
    imageUrl: resolveStorefrontImageUrl(category.imageUrl, CATEGORY_PLACEHOLDER_IMAGE),
    route: `/products?category=${category.id}`,
  };
}

export function mapProductToFlashDeal(product: Product, lang: SupportedLanguageId, index: number): FlashDeal {
  return {
    id: product.id,
    title: resolveLocalizedText(product.nameEn, product.nameAr, lang),
    subtitle: resolveLocalizedText(product.categoryName, product.categoryNameAr, lang),
    imageUrl: resolveStorefrontImageUrl(product.displayImageUrl),
    discountLabel: '',
    originalPriceUsd: product.price,
    currentPriceUsd: product.price,
    priceTone: PRICE_TONES[index % PRICE_TONES.length] ?? 'green',
  };
}

export function mapProductToTrendingRank(
  product: Product,
  lang: SupportedLanguageId,
  index: number,
): TrendingRankItem {
  return {
    id: product.id,
    rank: `#${index + 1}`,
    rankTone: RANK_TONES[index % RANK_TONES.length] ?? 'green',
    iconSrc: resolveStorefrontImageUrl(product.displayImageUrl),
    title: resolveLocalizedText(product.nameEn, product.nameAr, lang),
    subtitle: resolveLocalizedText(product.categoryName, product.categoryNameAr, lang),
    priceUsd: product.price,
    priceTone: RANK_TONES[index % RANK_TONES.length] ?? 'green',
    route: `/products/${product.id}`,
  };
}

export function mapProductToTrendingValue(product: Product, lang: SupportedLanguageId): TrendingValueItem {
  return {
    id: product.id,
    // Sourced from the newest-arrivals query, not a real "best value" comparison — keep this
    // badge to a claim the data actually backs (see CLAUDE.md's never-invent-savings/popularity rule).
    badge: 'NEW',
    title: resolveLocalizedText(product.nameEn, product.nameAr, lang),
    subtitle: resolveLocalizedText(product.categoryName, product.categoryNameAr, lang),
    priceUsd: product.price,
    route: `/products/${product.id}`,
  };
}

export function mapProductToFeaturedProduct(
  product: Product,
  lang: SupportedLanguageId,
  index = 0,
  badge = 'FEATURED',
  ctaLabel = 'View Product',
): StorefrontFeaturedProduct {
  return {
    id: product.id,
    badge,
    title: resolveLocalizedText(product.nameEn, product.nameAr, lang),
    description: resolveLocalizedText(product.descriptionEn, product.descriptionAr, lang),
    imageUrl: resolveStorefrontImageUrl(product.displayImageUrl),
    ctaLabel,
    route: `/products/${product.id}`,
  };
}

export function mapTrustItems(items: readonly StorefrontTrustItemContent[]): TrustFeature[] {
  return items.map((item) => ({
    id: item.id,
    iconSrc: resolveStorefrontImageUrl(item.iconUrl, 'assets/images/trust/instant-delivery.svg'),
    title: item.title,
    description: item.description,
  }));
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
      overlayImageUrl: response.hero.overlayImageUrl
        ? resolveStorefrontImageUrl(
            response.hero.overlayImageUrl,
            'assets/images/hambox-hero-overlay.png',
          )
        : null,
    },
    promoBanner: {
      ...response.promoBanner,
      imageUrl: resolveStorefrontImageUrl(
        response.promoBanner.imageUrl,
        'assets/images/hambox-hero-background.png',
      ),
    },
    trustBar: response.trustBar ?? [],
  };
}

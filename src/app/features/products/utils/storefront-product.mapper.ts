import { Product } from '../../catalog/models/product.model';
import { resolveProductImageUrl } from '../../catalog/utils/product-image.utils';
import { productPlaceholderImage, resolveStorefrontImageUrl } from '../../home/utils/storefront-home.mapper';
import { ProductDetailsItem } from '../../product-details/models/product-details';
import { DEFAULT_PRODUCT_DETAILS_EXTRAS } from '../services/storefront-products-data';
import { StoreProduct, StorePlatformTone } from '../models/product';
import { resolveLocalizedText } from '../../../core/i18n/localized-text.util';
import { SupportedLanguageId } from '../../../core/i18n/locale.model';

function resolveImageUrl(imageUrl?: string | null, index = 0): string {
  const resolved = resolveProductImageUrl(imageUrl ?? '');

  if (resolved) {
    return resolveStorefrontImageUrl(resolved, productPlaceholderImage(index));
  }

  return productPlaceholderImage(index);
}

function resolveGalleryImages(product: Product): readonly string[] {
  if (product.images?.length) {
    return product.images
      .slice()
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map((image) => resolveImageUrl(image.url));
  }

  const primary = resolveImageUrl(product.displayImageUrl);
  return primary ? [primary] : [];
}

function resolvePlatformTone(categoryName: string): StorePlatformTone {
  const normalized = categoryName.toLowerCase();

  if (normalized.includes('xbox')) {
    return 'xbox';
  }

  if (normalized.includes('playstation') || normalized.includes('psn')) {
    return 'psn';
  }

  if (normalized.includes('nintendo')) {
    return 'nintendo';
  }

  return 'pc';
}

export function mapProductToStoreProduct(
  product: Product,
  lang: SupportedLanguageId,
  index = 0,
): StoreProduct {
  const isActive = product.status === 'Active';
  const categoryName = resolveLocalizedText(product.categoryName, product.categoryNameAr, lang);

  return {
    id: product.id,
    title: resolveLocalizedText(product.nameEn, product.nameAr, lang),
    imageUrl: resolveImageUrl(product.displayImageUrl, index),
    platformLabel: categoryName,
    platformTone: resolvePlatformTone(product.categoryName),
    categoryName,
    instantDigital: isActive,
    priceUsd: product.price,
    cta: isActive ? 'cart' : 'notify-me',
    outOfStock: !isActive,
    stockStatus: isActive ? 'unknown' : 'out-of-stock',
    highlighted: isActive,
    createdOnUtc: product.createdOnUtc,
    listIndex: index,
    isMembersOnly: product.isMembersOnly,
    isComingSoon: product.canPurchase === false && !!product.publicReleaseOnUtc,
  };
}

export function mapProductToDetailsItem(product: Product, lang: SupportedLanguageId): ProductDetailsItem {
  const galleryImages = resolveGalleryImages(product);
  const primaryImage = galleryImages[0] ?? productPlaceholderImage(0);

  return {
    id: product.id,
    title: resolveLocalizedText(product.nameEn, product.nameAr, lang),
    description: resolveLocalizedText(product.descriptionEn, product.descriptionAr, lang),
    imageUrl: primaryImage,
    thumbnailUrl: primaryImage,
    galleryImages,
    priceUsd: product.price,
    originalPriceUsd: product.price,
    discountLabel: '',
    categoryId: product.categoryId,
    categoryName: resolveLocalizedText(product.categoryName, product.categoryNameAr, lang),
    ...DEFAULT_PRODUCT_DETAILS_EXTRAS,
    publicReleaseOnUtc: product.publicReleaseOnUtc ?? null,
    isMembersOnly: !!product.isMembersOnly,
    canPurchase: product.canPurchase !== false,
    requiredPlanNames: product.requiredPlanNames ?? [],
  };
}

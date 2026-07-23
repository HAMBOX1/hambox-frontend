import { Product, ProductStatus, UpdateProductRequest } from '../models/product.model';

export function productStatusLabel(status: ProductStatus): string {
  switch (status) {
    case 'Draft':
      return 'Draft';
    case 'Active':
      return 'Active';
    case 'Inactive':
      return 'Inactive';
    case 'Archived':
      return 'Archived';
    default:
      return status;
  }
}

export function productStatusSeverity(
  status: ProductStatus,
): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined {
  switch (status) {
    case 'Active':
      return 'success';
    case 'Draft':
      return 'info';
    case 'Inactive':
      return 'warn';
    case 'Archived':
      return 'secondary';
    default:
      return 'secondary';
  }
}

export function formatProductPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(price);
}

export function toUpdateProductRequest(product: Product, status: ProductStatus): UpdateProductRequest {
  return {
    nameAr: product.nameAr,
    nameEn: product.nameEn,
    descriptionAr: product.descriptionAr,
    descriptionEn: product.descriptionEn,
    price: product.price,
    categoryId: product.categoryId,
    status,
    additionalCategoryIds: product.additionalCategoryIds ?? [],
  };
}

const PRODUCT_STATUS_API: Record<ProductStatus, number> = {
  Draft: 0,
  Active: 1,
  Inactive: 2,
  Archived: 3,
};

export function productStatusToApi(status: ProductStatus): number {
  return PRODUCT_STATUS_API[status];
}

/** Dash-cased technical key derived from a human-entered label, e.g. "Game Region" -> "game-region". */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

import { PagedResult } from './category.model';

export type { PagedResult };

export type ProductStatus = 'Draft' | 'Active' | 'Inactive' | 'Archived';

/** Where `Product.displayImageUrl` was resolved from — see backend `ProductDisplayImageSource`. */
export type ProductDisplayImageSource = 'Product' | 'Category' | 'ParentCategory' | 'Placeholder';

export type ProductSortBy =
  | 'Newest'
  | 'PriceAsc'
  | 'PriceDesc'
  | 'NameAsc'
  | 'NameDesc'
  | 'CategoryAsc'
  | 'CategoryDesc'
  | 'StatusAsc'
  | 'StatusDesc'
  | 'StockAsc'
  | 'StockDesc';

export interface ProductImage {
  readonly id: string;
  readonly url: string;
  readonly fileName: string;
  readonly contentType: string;
  readonly fileSizeBytes: number;
  readonly displayOrder: number;
  readonly isPrimary: boolean;
}

export interface Product {
  readonly id: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly descriptionAr: string;
  readonly descriptionEn: string;
  readonly price: number;
  readonly status: ProductStatus;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly categoryNameAr: string;
  readonly additionalCategoryIds?: readonly string[];
  readonly collectionIds?: readonly string[];
  readonly primaryImageUrl?: string | null;
  readonly images?: readonly ProductImage[] | null;
  readonly createdOnUtc?: string;
  readonly availableStock?: number;
  /** Resolved server-side (product image, else category image, else placeholder) — always
   * present on real API responses; optional here only so existing test fixtures still compile. */
  readonly displayImageUrl?: string;
  readonly displayImageSource?: ProductDisplayImageSource;
  /** Null if already public; a future date if gated behind the Early Access membership benefit. */
  readonly publicReleaseOnUtc?: string | null;
  /** True if any membership plan restricts purchase of this product (Exclusive Products benefit). */
  readonly isMembersOnly?: boolean;
  /** True if the current viewer may purchase this product right now — both the membership
   * restriction and the release-date gate are satisfied. Defaults true for existing test fixtures. */
  readonly canPurchase?: boolean;
  /** When isMembersOnly is true, the plan(s) that grant access — drives the upgrade CTA copy. */
  readonly requiredPlanNames?: readonly string[] | null;
}

export interface CreateProductRequest {
  readonly nameAr: string;
  readonly nameEn: string;
  readonly descriptionAr: string;
  readonly descriptionEn: string;
  readonly price: number;
  readonly categoryId: string;
  readonly additionalCategoryIds?: readonly string[];
  readonly collectionIds?: readonly string[];
  readonly publicReleaseOnUtc?: string | null;
}

export interface UpdateProductRequest {
  readonly nameAr: string;
  readonly nameEn: string;
  readonly descriptionAr: string;
  readonly descriptionEn: string;
  readonly price: number;
  readonly categoryId: string;
  readonly status: ProductStatus;
  readonly additionalCategoryIds?: readonly string[];
  readonly collectionIds?: readonly string[];
  readonly publicReleaseOnUtc?: string | null;
}

export interface ProductAssetFile {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly file?: File;
  readonly previewUrl?: string;
  readonly persisted?: boolean;
  readonly isPrimary?: boolean;
  readonly contentType?: string;
}

export interface ProductDraftFormSnapshot {
  readonly nameEn: string;
  readonly nameAr: string;
  readonly descriptionEn: string;
  readonly descriptionAr: string;
  readonly price: number;
  readonly categoryId: string;
  readonly additionalCategoryIds: readonly string[];
  readonly collectionIds: readonly string[];
  readonly publicReleaseOnUtc: string | null;
}

export interface ProductListQuery {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchTerm?: string;
  readonly status?: ProductStatus;
  readonly categoryId?: string;
  readonly sortBy?: ProductSortBy;
  readonly attributes?: Readonly<Record<string, readonly string[]>>;
  readonly collectionId?: string;
}

export interface ProductFacetQuery {
  readonly searchTerm?: string;
  readonly categoryId?: string;
  readonly attributes?: Readonly<Record<string, readonly string[]>>;
}

/** One global option-group facet (e.g. Platform), deduplicated across every product. */
export interface ProductFacetGroup {
  readonly key: string;
  readonly displayName: string;
  readonly options: readonly ProductFacetOption[];
}

export interface ProductFacetOption {
  readonly value: string;
  readonly label: string;
  readonly count: number;
}

/** Either an explicit set of product ids, or (when `selectAllMatching` is true) the current list
 * filter, resolved server-side — lets "select all matching filter" scale past the loaded page. */
export interface ProductBulkSelection {
  readonly productIds?: readonly string[];
  readonly searchTerm?: string;
  readonly status?: ProductStatus;
  readonly categoryId?: string;
  readonly selectAllMatching: boolean;
}

/** Discriminator for `ProductApiService.bulkProducts` — see backend `BulkProductsRequest` doc comment. */
export type BulkProductAction =
  | 'publish'
  | 'unpublish'
  | 'archive'
  | 'change-category'
  | 'adjust-price'
  | 'assign-collection'
  | 'remove-collection';

export type PriceAdjustmentMode = 'IncreasePercent' | 'DecreasePercent' | 'SetFixed';

export interface BulkProductsResult {
  readonly successCount: number;
  readonly errorCount: number;
  readonly errors: readonly string[];
}

export interface ProductInventoryPlaceholders {
  readonly liveStock: string;
  readonly avgMargin: string;
  readonly internalSku: string;
  readonly catalogStatus: string;
  readonly lastRestock: string;
  readonly source: string;
}

export const DEFAULT_PRODUCT_INVENTORY_PLACEHOLDERS: ProductInventoryPlaceholders = {
  liveStock: '—',
  avgMargin: '—',
  internalSku: 'Pending assignment',
  catalogStatus: 'Awaiting sync',
  lastRestock: '—',
  source: 'Manual Bulk',
};

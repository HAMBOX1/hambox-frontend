import { PagedResult } from './category.model';

export type { PagedResult };

export type ProductStatus = 'Draft' | 'Active' | 'Inactive' | 'Archived';

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
  readonly primaryImageUrl?: string | null;
  readonly images?: readonly ProductImage[] | null;
  readonly createdOnUtc?: string;
  readonly availableStock?: number;
}

export interface CreateProductRequest {
  readonly nameAr: string;
  readonly nameEn: string;
  readonly descriptionAr: string;
  readonly descriptionEn: string;
  readonly price: number;
  readonly categoryId: string;
  readonly additionalCategoryIds?: readonly string[];
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
}

export interface ProductListQuery {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchTerm?: string;
  readonly status?: ProductStatus;
  readonly categoryId?: string;
  readonly sortBy?: ProductSortBy;
  readonly attributes?: Readonly<Record<string, readonly string[]>>;
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

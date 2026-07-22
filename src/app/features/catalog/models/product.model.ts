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
}

export interface UpdateProductRequest {
  readonly nameAr: string;
  readonly nameEn: string;
  readonly descriptionAr: string;
  readonly descriptionEn: string;
  readonly price: number;
  readonly categoryId: string;
  readonly status: ProductStatus;
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

export interface ProductDraftAssetMetadata {
  readonly name: string;
  readonly size: number;
}

export interface ProductDraftFormSnapshot {
  readonly nameEn: string;
  readonly nameAr: string;
  readonly descriptionEn: string;
  readonly descriptionAr: string;
  readonly price: number;
  readonly categoryId: string;
}

export interface ProductDraftData extends ProductDraftFormSnapshot {
  readonly version: 1;
  readonly savedAt: string;
  readonly activeStep: ProductCreateStepId;
  readonly assets: readonly ProductDraftAssetMetadata[];
}

export type ProductCreateStepId =
  | 'overview'
  | 'basic-information'
  | 'variants'
  | 'fulfillment'
  | 'pricing'
  | 'inventory'
  | 'seo'
  | 'visibility';

export interface ProductCreateStep {
  readonly id: ProductCreateStepId;
  readonly label: string;
  readonly enabled: boolean;
}

export const PRODUCT_CREATE_STEPS: readonly ProductCreateStep[] = [
  { id: 'overview', label: 'Overview', enabled: true },
  { id: 'basic-information', label: 'Basic Information', enabled: true },
  { id: 'variants', label: 'Variants', enabled: false },
  { id: 'fulfillment', label: 'Fulfillment', enabled: false },
  { id: 'pricing', label: 'Pricing', enabled: false },
  { id: 'inventory', label: 'Inventory', enabled: false },
  { id: 'seo', label: 'SEO', enabled: false },
  { id: 'visibility', label: 'Visibility', enabled: false },
] as const;

export interface ProductListQuery {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchTerm?: string;
  readonly status?: ProductStatus;
  readonly categoryId?: string;
  readonly sortBy?: ProductSortBy;
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

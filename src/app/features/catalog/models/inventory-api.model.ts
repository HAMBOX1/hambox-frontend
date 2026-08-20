export interface ProductOptionDto {
  readonly id: string;
  readonly optionGroupId: string;
  readonly value: string;
  readonly label: string;
  readonly sortOrder: number;
  readonly descriptionHtml?: string | null;
}

export interface ProductOptionGroupDto {
  readonly id: string;
  readonly productId: string;
  readonly parentOptionId: string | null;
  readonly key: string;
  readonly displayName: string;
  readonly sortOrder: number;
  readonly isRequired: boolean;
  readonly options: readonly ProductOptionDto[];
}

/** Matches backend `HAMBOX.Modules.Catalog.Domain.Enums.FulfillmentMode`. */
export type FulfillmentMode = 'ManualOnly' | 'ManualFirst' | 'SupplierFirst' | 'SupplierOnly';

export const FULFILLMENT_MODES: readonly FulfillmentMode[] = [
  'ManualOnly',
  'ManualFirst',
  'SupplierFirst',
  'SupplierOnly',
];

export interface ProductVariantDto {
  readonly id: string;
  readonly productId: string;
  readonly planId: string | null;
  readonly sku: string;
  readonly priceOverride: number | null;
  readonly comparePrice: number | null;
  readonly sortOrder: number;
  readonly status: string;
  readonly isVisible: boolean;
  readonly membershipPlanId: string | null;
  readonly lowStockThreshold: number;
  readonly availableStock: number;
  readonly reservedStock: number;
  readonly soldStock: number;
  readonly totalCodesCount: number;
  readonly isLowStock: boolean;
  readonly isOutOfStock: boolean;
  readonly optionIds: readonly string[];
  readonly fulfillmentMode: FulfillmentMode;
}

export interface SetVariantFulfillmentModeRequest {
  readonly fulfillmentMode: FulfillmentMode;
}

export interface InventorySupplierDto {
  readonly id: string;
  readonly companyName: string;
  readonly contactPerson: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly website: string | null;
  readonly country: string | null;
  readonly currency: string;
  readonly notes: string | null;
  readonly status: string;
}

export interface InventoryBatchDto {
  readonly id: string;
  readonly variantId: string;
  readonly supplierId: string | null;
  readonly name: string;
  readonly purchaseDate: string | null;
  readonly importDate: string;
  readonly currency: string;
  readonly purchaseCost: number;
  readonly expectedMargin: number | null;
  readonly notes: string | null;
  readonly totalCodes: number;
  readonly availableCodes: number;
  readonly reservedCodes: number;
  readonly soldCodes: number;
  readonly returnedCodes: number;
  readonly expiredCodes: number;
}

export interface DigitalInventoryCodeDto {
  readonly id: string;
  readonly variantId: string;
  readonly batchId: string;
  readonly supplierId: string | null;
  readonly digitalCode: string;
  readonly serialNumber: string | null;
  readonly status: string;
  readonly purchaseCost: number | null;
  readonly sellingPriceOverride: number | null;
  readonly currency: string;
  readonly expirationDate: string | null;
  readonly reservedOnUtc: string | null;
  readonly soldOnUtc: string | null;
}

export interface InventoryAuditLogDto {
  readonly id: string;
  readonly action: string;
  readonly productId: string | null;
  readonly variantId: string | null;
  readonly batchId: string | null;
  readonly codeId: string | null;
  readonly performedByUserId: string | null;
  readonly details: string | null;
  readonly occurredOnUtc: string;
}

export interface InventoryStatisticsDto {
  readonly available: number;
  readonly reserved: number;
  readonly sold: number;
  readonly expired: number;
  readonly lowStockVariants: number;
  readonly outOfStockVariants: number;
  readonly inventoryValue: number;
  readonly purchaseCost: number;
  readonly estimatedRevenue: number;
  readonly estimatedProfit: number;
}

export interface InventoryReservationDto {
  readonly id: string;
  readonly codeId: string;
  readonly variantId: string;
  readonly userId: string | null;
  readonly cartId: string | null;
  readonly expiresOnUtc: string;
  readonly isActive: boolean;
}

export interface StorefrontVariantDto {
  readonly id: string;
  readonly sku: string;
  readonly price: number;
  readonly comparePrice: number | null;
  readonly availableStock: number;
  readonly isLowStock: boolean;
  readonly isOutOfStock: boolean;
  readonly optionIds: readonly string[];
  readonly isCompleteCombination: boolean;
}

export interface StorefrontProductConfigurationDto {
  readonly productId: string;
  readonly basePrice: number;
  readonly optionGroups: readonly ProductOptionGroupDto[];
  readonly variants: readonly StorefrontVariantDto[];
}

export interface GenerateProductVariantsResultDto {
  readonly createdCount: number;
  readonly preservedCount: number;
  readonly totalCombinations: number;
}

export interface BulkUpdateVariantsRequest {
  readonly variantIds: readonly string[];
  readonly priceOverride?: number | null;
  readonly status?: string | null;
}

export interface BulkVariantIdsRequest {
  readonly variantIds: readonly string[];
}

export interface BulkVariantsResultDto {
  readonly successCount: number;
  readonly errorCount: number;
  readonly errors: readonly string[];
  /** Populated only by bulk delete (empty for bulk duplicate) — the ids that were blocked. */
  readonly blockedVariantIds: readonly string[];
}

export interface CreateVariantRequest {
  readonly sku: string;
  readonly planId?: string | null;
  readonly priceOverride?: number | null;
  readonly comparePrice?: number | null;
  readonly sortOrder: number;
  readonly membershipPlanId?: string | null;
  readonly lowStockThreshold: number;
  readonly optionIds: readonly string[];
}

export interface CreateOptionGroupRequest {
  readonly key: string;
  readonly displayName: string;
  readonly sortOrder: number;
  readonly isRequired: boolean;
  readonly parentOptionId?: string | null;
}

export interface CreateOptionRequest {
  readonly value: string;
  readonly label: string;
  readonly sortOrder: number;
  readonly descriptionHtml?: string | null;
}

export interface CreateSupplierRequest {
  readonly companyName: string;
  readonly contactPerson?: string | null;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly website?: string | null;
  readonly country?: string | null;
  readonly currency: string;
  readonly notes?: string | null;
}

export interface CreateBatchRequest {
  readonly name: string;
  readonly supplierId?: string | null;
  readonly purchaseDate?: string | null;
  readonly currency: string;
  readonly purchaseCost: number;
  readonly expectedMargin?: number | null;
  readonly notes?: string | null;
}

export interface ImportCodesRequest {
  readonly codes: readonly string[];
}

export interface ImportCodeDuplicateDto {
  readonly code: string;
  readonly productName: string;
  readonly variantName: string;
  readonly batchName: string | null;
}

export interface ImportCodesResultDto {
  readonly totalSubmitted: number;
  readonly importedCount: number;
  readonly duplicateCount: number;
  readonly invalidCount: number;
  readonly duplicates: readonly ImportCodeDuplicateDto[];
}

export interface UpdateVariantRequest {
  readonly sku: string;
  readonly planId?: string | null;
  readonly priceOverride?: number | null;
  readonly comparePrice?: number | null;
  readonly sortOrder: number;
  readonly status: string;
  readonly isVisible: boolean;
  readonly membershipPlanId?: string | null;
  readonly lowStockThreshold: number;
  readonly optionIds: readonly string[];
}

export interface DuplicateVariantRequest {
  readonly skuSuffix?: string | null;
}

export interface UpdateOptionGroupRequest {
  readonly displayName: string;
  readonly sortOrder: number;
  readonly isRequired: boolean;
}

export interface UpdateOptionRequest {
  readonly label: string;
  readonly sortOrder: number;
  readonly descriptionHtml?: string | null;
}

export interface OptionGroupTemplateSummaryDto {
  readonly id: string;
  readonly name: string;
  readonly optionCount: number;
}

export interface OptionGroupTemplateOptionDto {
  readonly id: string;
  readonly value: string;
  readonly label: string;
  readonly sortOrder: number;
  readonly descriptionHtml: string | null;
}

export interface OptionGroupTemplateDto {
  readonly id: string;
  readonly name: string;
  readonly isRequiredDefault: boolean;
  readonly options: readonly OptionGroupTemplateOptionDto[];
}

export interface OptionGroupTemplateOptionInput {
  readonly value: string;
  readonly label: string;
  readonly sortOrder: number;
  readonly descriptionHtml?: string | null;
}

export interface SaveOptionGroupAsTemplateRequest {
  readonly name: string;
}

export interface UpdateOptionGroupTemplateRequest {
  readonly name: string;
  readonly isRequiredDefault: boolean;
  readonly options: readonly OptionGroupTemplateOptionInput[];
}

export type ImportConflictResolution = 'AddSeparate' | 'Replace';

export interface ImportOptionGroupTemplateRequest {
  readonly templateId: string;
  readonly resolution: ImportConflictResolution;
}

export interface OptionDescriptionTemplateDto {
  readonly id: string;
  readonly name: string;
  readonly descriptionHtml: string;
}

export interface CreateOptionDescriptionTemplateRequest {
  readonly name: string;
  readonly descriptionHtml: string;
}

export interface UpdateOptionDescriptionTemplateRequest {
  readonly name: string;
  readonly descriptionHtml: string;
}

export interface ReorderIdsRequest {
  readonly orderedIds: readonly string[];
}

export interface BulkCodeIdsRequest {
  readonly codeIds: readonly string[];
}

export interface BulkCodeActionResultDto {
  readonly affected: number;
}

export interface RevealInventoryCodeDto {
  readonly digitalCode: string;
}

/** `type` is a stable machine key (e.g. "SoldInventoryCodes") mapped to i18n copy on the frontend. */
export interface VariantUsageItemDto {
  readonly type: string;
  readonly count: number;
}

export interface VariantUsageCategoryDto {
  readonly items: readonly VariantUsageItemDto[];
  readonly totalCount: number;
}

export interface VariantUsageDto {
  readonly variantId: string;
  readonly safeToRemove: VariantUsageCategoryDto;
  readonly safeToDetach: VariantUsageCategoryDto;
  readonly protectedHistory: VariantUsageCategoryDto;
  readonly canPermanentlyDelete: boolean;
}

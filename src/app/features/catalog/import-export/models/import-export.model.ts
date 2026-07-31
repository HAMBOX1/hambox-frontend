import { ProductStatus } from '../../models/product.model';

export type CatalogPackageFormat = 'Hambox' | 'Xlsx' | 'Csv';
export type CatalogImportEntityType = 'FullPackage' | 'Products' | 'Categories' | 'Inventory' | 'Codes' | 'Collections';
export type CatalogDuplicateStrategy = 'Skip' | 'Update' | 'Merge' | 'Rename';
export type CatalogImportRowStatus = 'New' | 'Updated' | 'Duplicate' | 'Invalid';
export type CatalogPackageDirection = 'Export' | 'Import';
export type CatalogPackageJobStatus = 'Uploaded' | 'Queued' | 'Processing' | 'Completed' | 'Failed';
export type CatalogSkuStrategy = 'UseImportedSku' | 'AutoGenerate' | 'GenerateMissingOnly';

export interface CatalogPackageOptions {
  readonly includeCategories: boolean;
  readonly includeVariants: boolean;
  readonly includeInventory: boolean;
  readonly includeDigitalCodes: boolean;
  readonly includeImages: boolean;
  readonly includeLocalization: boolean;
  readonly includeSuppliers: boolean;
  readonly includeCollections: boolean;
}

export function defaultCatalogPackageOptions(): CatalogPackageOptions {
  return {
    includeCategories: true,
    includeVariants: true,
    includeInventory: true,
    includeDigitalCodes: false,
    includeImages: true,
    includeLocalization: true,
    includeSuppliers: false,
    includeCollections: true,
  };
}

export interface CatalogExportRequest {
  readonly productIds?: readonly string[];
  readonly searchTerm?: string;
  readonly status?: ProductStatus;
  readonly categoryId?: string;
  readonly selectAllMatching: boolean;
  readonly exportEntireCatalog: boolean;
  readonly format: CatalogPackageFormat;
  readonly options: CatalogPackageOptions;
  readonly encryptCodes: boolean;
  readonly passwordProtectPackage: boolean;
  readonly packagePassword?: string;
}

/** Which lookup a bad cell belongs to — drives the wizard's "select existing / create new" correction control. */
export type CatalogImportIssueType =
  | 'UnknownCategory'
  | 'UnknownCollection'
  | 'UnknownSupplier'
  | 'UnknownProduct'
  | 'UnknownVariant'
  | 'UnknownVariantGroup'
  | 'UnknownVariantOption'
  | 'DuplicateSku';

export interface CatalogImportFieldIssue {
  readonly column: string;
  readonly value: string;
  readonly issueType: CatalogImportIssueType;
}

export interface CatalogImportRowResult {
  readonly rowNumber: number;
  readonly entityType: string;
  readonly label: string;
  readonly status: CatalogImportRowStatus;
  readonly errors: readonly string[];
  readonly fieldIssues: readonly CatalogImportFieldIssue[];
}

/** "Apply to all N occurrences" — a value substitution sent back to Validate/Execute instead of re-uploading the file. `createNew` additionally creates a brand-new category/collection named `toValue` (see the correction UI's "Create new" option) — ignored for every other entity/column pair. */
export interface CatalogImportCorrection {
  readonly entityType: string;
  readonly column: string;
  readonly fromValue: string;
  readonly toValue: string;
  readonly createNew?: boolean;
}

/** Per-row override of the global duplicate strategy — the "Duplicate SKU → Update Existing / Generate New / Skip" inline control. */
export interface CatalogImportRowOverride {
  readonly rowNumber: number;
  readonly entityType: string;
  readonly strategy: CatalogDuplicateStrategy;
}

export interface CatalogImportLookupItem {
  readonly value: string;
  readonly label: string;
}

export interface CatalogImportLookups {
  readonly categories: readonly CatalogImportLookupItem[];
  readonly collections: readonly CatalogImportLookupItem[];
  readonly variantGroups: readonly CatalogImportLookupItem[];
  readonly productStatuses: readonly string[];
  readonly variantStatuses: readonly string[];
  readonly currencies: readonly string[];
  readonly skuStrategies: readonly string[];
  readonly duplicateStrategies: readonly string[];
}

export interface CatalogImportValidationReport {
  readonly uploadId: string;
  readonly format: CatalogPackageFormat;
  readonly entityType: CatalogImportEntityType;
  readonly newCount: number;
  readonly updatedCount: number;
  readonly duplicateCount: number;
  readonly invalidCount: number;
  readonly warnings: readonly string[];
  readonly rows: readonly CatalogImportRowResult[];
}

export interface CatalogPackageSummary {
  readonly createdCount: number;
  readonly updatedCount: number;
  readonly skippedCount: number;
  readonly failedCount: number;
  readonly errors: readonly string[];
}

export interface CatalogPackageJobDto {
  readonly id: string;
  readonly direction: CatalogPackageDirection;
  readonly format: CatalogPackageFormat;
  readonly entityType: CatalogImportEntityType;
  readonly status: CatalogPackageJobStatus;
  readonly progressPercent: number;
  readonly fileName: string | null;
  readonly resultFileName: string | null;
  readonly summary: CatalogPackageSummary | null;
  readonly errorMessage: string | null;
  readonly createdOnUtc: string;
  readonly createdBy: string | null;
  readonly modifiedOnUtc: string | null;
}

export interface PagedResult<T> {
  readonly items: readonly T[];
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly totalPages?: number;
  readonly hasPreviousPage?: boolean;
  readonly hasNextPage?: boolean;
}

export const IMPORT_WIZARD_STEPS = ['upload', 'validate', 'strategy', 'execute', 'summary'] as const;
export type ImportWizardStep = (typeof IMPORT_WIZARD_STEPS)[number];

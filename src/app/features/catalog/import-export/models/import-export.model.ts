import { ProductStatus } from '../../models/product.model';

export type CatalogPackageFormat = 'Hambox' | 'Xlsx' | 'Csv';
export type CatalogImportEntityType = 'FullPackage' | 'Products' | 'Categories' | 'Inventory' | 'Codes' | 'Collections';
export type CatalogDuplicateStrategy = 'Skip' | 'Update' | 'Merge' | 'Rename';
export type CatalogImportRowStatus = 'New' | 'Updated' | 'Duplicate' | 'Invalid';
export type CatalogPackageDirection = 'Export' | 'Import';
export type CatalogPackageJobStatus = 'Uploaded' | 'Queued' | 'Processing' | 'Completed' | 'Failed';

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

export interface CatalogImportRowResult {
  readonly rowNumber: number;
  readonly entityType: string;
  readonly label: string;
  readonly status: CatalogImportRowStatus;
  readonly errors: readonly string[];
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
}

export const IMPORT_WIZARD_STEPS = ['upload', 'validate', 'strategy', 'execute', 'summary'] as const;
export type ImportWizardStep = (typeof IMPORT_WIZARD_STEPS)[number];

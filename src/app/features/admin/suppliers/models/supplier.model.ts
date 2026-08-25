import { PagedResult } from '../../../catalog/models/category.model';

export type SupplierStatus = 'Active' | 'Inactive' | 'Suspended';
export type SupplierAuthenticationType = 'None' | 'ApiKey' | 'BasicAuth' | 'BearerToken' | 'OAuth2';
export type SupplierMappingStatus = 'Active' | 'Inactive';
/** Mirrors backend `SupplierAvailabilityState` (Suppliers.Domain) — Unknown covers both "never synced" and "sync failed". */
export type SupplierAvailabilityState = 'Available' | 'Unavailable' | 'Unknown';

export interface SupplierListItemDto {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly providerType: string;
  readonly status: SupplierStatus;
  readonly priority: number;
  readonly isEnabled: boolean;
  readonly baseUrl: string | null;
  readonly createdOnUtc: string;
  readonly supportsOrderStatus: boolean;
}

export interface SupplierDetailDto {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly providerType: string;
  readonly status: SupplierStatus;
  readonly priority: number;
  readonly baseUrl: string | null;
  readonly authenticationType: SupplierAuthenticationType;
  readonly settingsJson: string | null;
  readonly username: string | null;
  readonly hasApiKey: boolean;
  readonly hasApiSecret: boolean;
  readonly hasPassword: boolean;
  readonly hasBearerToken: boolean;
  readonly hasOAuthSettings: boolean;
  readonly supportsInventorySync: boolean;
  readonly supportsPriceSync: boolean;
  readonly supportsReservations: boolean;
  readonly supportsOrderStatus: boolean;
  readonly supportsWebhooks: boolean;
  readonly isEnabled: boolean;
  readonly createdOnUtc: string;
  readonly modifiedOnUtc: string | null;
}

export interface CreateSupplierRequest {
  name: string;
  code: string;
  providerType: string;
  authenticationType: SupplierAuthenticationType;
  baseUrl: string | null;
  priority: number;
  supportsInventorySync: boolean;
  supportsPriceSync: boolean;
  supportsReservations: boolean;
  supportsOrderStatus: boolean;
  supportsWebhooks: boolean;
}

export interface UpdateSupplierRequest {
  name: string;
  providerType: string;
  authenticationType: SupplierAuthenticationType;
  baseUrl: string | null;
  supportsInventorySync: boolean;
  supportsPriceSync: boolean;
  supportsReservations: boolean;
  supportsOrderStatus: boolean;
  supportsWebhooks: boolean;
}

export interface UpdateSupplierCredentialsRequest {
  apiKey: string | null;
  apiSecret: string | null;
  username: string | null;
  password: string | null;
  bearerToken: string | null;
  oAuthSettingsJson: string | null;
}

export interface UpdateSupplierSettingsRequest {
  settingsJson: string | null;
}

export interface SupplierTestConnectionResultDto {
  readonly isSuccess: boolean;
  readonly message: string;
}

export interface SupplierMappingDto {
  readonly id: string;
  readonly supplierId: string;
  readonly internalProductId: string;
  /** Null = product-wide mapping (applies to every variant without a more specific mapping). */
  readonly internalProductVariantId: string | null;
  readonly externalProductId: string;
  readonly externalSku: string | null;
  readonly externalName: string | null;
  readonly buyingPrice: number;
  readonly currency: string;
  readonly priority: number;
  readonly status: SupplierMappingStatus;
  readonly createdOnUtc: string;
  /** Display-only enrichment resolved server-side from Catalog — null if the product/variant can no longer be found. */
  readonly internalProductName: string | null;
  readonly internalVariantSku: string | null;
  /** Null means the same as 'Unknown' — either the provider has no availability signal (e.g. Manual) or this mapping hasn't been synced yet. */
  readonly availabilityState: SupplierAvailabilityState | null;
  readonly availableQuantity: number | null;
  readonly availabilityLastCheckedAtUtc: string | null;
}

/** Counts for the supplier detail page's availability status section, from `GET /suppliers/{id}/availability-summary`. */
export interface SupplierAvailabilitySummaryDto {
  readonly mappedCount: number;
  readonly availableCount: number;
  readonly unavailableCount: number;
  readonly unknownCount: number;
  readonly lastSyncedAtUtc: string | null;
}

/** Result of a "Sync now" action, from `POST /suppliers/{id}/availability/sync`. */
export interface SupplierAvailabilitySyncResultDto {
  readonly supplierId: string;
  readonly isSuccess: boolean;
  readonly mappingsChecked: number;
  readonly availableCount: number;
  readonly unavailableCount: number;
  readonly unknownCount: number;
  readonly message: string | null;
}

export interface CreateSupplierMappingRequest {
  internalProductId: string;
  externalProductId: string;
  externalSku: string | null;
  externalName: string | null;
  buyingPrice: number;
  currency: string;
  priority: number;
  internalProductVariantId?: string | null;
}

/** Mapping scope, matching backend `SupplierFulfillmentChainCandidateDto.Scope`. */
export type FulfillmentMappingScope = 'VariantSpecific' | 'ProductWide';

/**
 * One entry in a product/variant's fulfillment chain — safe metadata only, from
 * `GET /suppliers/fulfillment-chain`. Never contains credential values.
 */
export interface SupplierFulfillmentChainCandidateDto {
  readonly mappingId: string;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly providerType: string;
  readonly scope: FulfillmentMappingScope;
  readonly externalProductId: string;
  readonly priority: number;
  readonly mappingStatus: SupplierMappingStatus;
  readonly supplierEnabled: boolean;
  readonly credentialsConfigured: boolean;
  readonly providerRegistered: boolean;
  readonly isReady: boolean;
}

export interface UpdateSupplierMappingRequest {
  externalProductId: string;
  externalSku: string | null;
  externalName: string | null;
  buyingPrice: number;
  currency: string;
  priority: number;
  status: SupplierMappingStatus;
}

/** One selectable supplier catalog product/denomination — safe display fields only, from `GET /suppliers/{id}/catalog`. */
export interface SupplierCatalogItemDto {
  readonly externalProductId: string;
  readonly name: string;
  readonly brandName: string | null;
  readonly currency: string;
  readonly minFaceValue: number | null;
  readonly maxFaceValue: number | null;
  readonly available: boolean;
}

export interface SupplierCatalogSearchResultDto {
  readonly isSuccess: boolean;
  readonly items: readonly SupplierCatalogItemDto[];
  readonly message: string | null;
}

export type SupplierListResult = PagedResult<SupplierListItemDto>;

// ─── Map Products workspace ─────────────────────────────────────

/** One eligible HAMBOX product variant, alongside this supplier's own mapping for it (if any) — the Map
 * Products table's row shape. `existingMappingId` null means unmapped. */
export interface SupplierMappingCandidateDto {
  readonly productId: string;
  readonly productName: string;
  readonly categoryName: string;
  readonly variantId: string;
  readonly variantDisplayName: string;
  readonly variantSku: string;
  readonly existingMappingId: string | null;
  readonly externalProductId: string | null;
  readonly externalName: string | null;
  readonly buyingPrice: number | null;
  readonly currency: string | null;
  readonly availabilityState: SupplierAvailabilityState | null;
}

export type SupplierMappingCandidatesResult = PagedResult<SupplierMappingCandidateDto>;

/** Stat-card counts for the Map Products header and the supplier detail page's Fulfillment Health block. */
export interface SupplierMappingCandidatesSummaryDto {
  readonly eligibleCount: number;
  readonly mappedCount: number;
  readonly unmappedCount: number;
}

export interface SuggestionCandidate {
  readonly productId: string;
  readonly variantId: string;
}

export type MatchConfidenceTier = 'High' | 'Medium' | 'None';

/** Live auto-match result for one candidate. `bestMatch` is null exactly when `confidenceTier` is
 * `'None'` — never auto-created as a mapping, only ever a suggestion the admin reviews or confirms. */
export interface SupplierMappingSuggestionDto {
  readonly productId: string;
  readonly variantId: string;
  readonly bestMatch: SupplierCatalogItemDto | null;
  readonly confidenceScore: number;
  readonly confidenceTier: MatchConfidenceTier;
}

export interface BulkMappingFailureDto {
  readonly productId: string;
  readonly variantId: string | null;
  readonly errorCode: string;
  readonly errorMessage: string;
}

/** Result of the "Confirm N Mappings" bulk action — partial success is expected and normal. */
export interface BulkCreateSupplierMappingsResultDto {
  readonly createdMappingIds: readonly string[];
  readonly failures: readonly BulkMappingFailureDto[];
}

/** Cross-supplier, business-friendly mapping status for one product on the admin product list. */
export type ProductSupplierMappingStatus =
  | 'FullyMapped'
  | 'PartiallyMapped'
  | 'Unmapped'
  | 'SupplierUnavailable'
  | 'MappingError';

export interface ProductSupplierMappingStatusDto {
  readonly status: ProductSupplierMappingStatus;
  readonly mappedVariantCount: number;
  readonly totalVariantCount: number;
  readonly primarySupplierName: string | null;
}

export const SUPPLIER_MAPPING_STATUS_OPTIONS: readonly { label: string; value: ProductSupplierMappingStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Fully mapped', value: 'FullyMapped' },
  { label: 'Partially mapped', value: 'PartiallyMapped' },
  { label: 'Unmapped', value: 'Unmapped' },
  { label: 'Supplier unavailable', value: 'SupplierUnavailable' },
  { label: 'Mapping error', value: 'MappingError' },
];

/** One variant's resolved mapping (if any), across every supplier — the product-centric counterpart to
 * `SupplierFulfillmentChainCandidateDto`. Backs the product-centric mapping drawer's per-variant list
 * and the product edit page's Supplier Fulfillment summary, from `GET /suppliers/product-mappings`. */
export interface ProductVariantSupplierMappingDto {
  readonly variantId: string;
  readonly variantDisplayName: string;
  readonly variantSku: string;
  readonly mappingId: string | null;
  readonly supplierId: string | null;
  readonly supplierName: string | null;
  readonly externalProductId: string | null;
  readonly externalName: string | null;
  readonly buyingPrice: number | null;
  readonly currency: string | null;
  readonly priority: number | null;
  readonly availabilityState: SupplierAvailabilityState | null;
  readonly mappingStatus: 'Mapped' | 'Unmapped';
}

export const SUPPLIER_STATUS_OPTIONS: readonly { label: string; value: SupplierStatus | 'all' }[] = [
  { label: 'All statuses', value: 'all' },
  { label: 'Active', value: 'Active' },
  { label: 'Inactive', value: 'Inactive' },
  { label: 'Suspended', value: 'Suspended' },
];

/**
 * `BasicAuth` here means exactly what HTTP Basic Auth actually sends — an identifier and a secret,
 * base64-encoded — never a literal "Username"/"Password" pair. That's also what the backend's own
 * `Supplier.HasCredentialsConfigured` readiness check already assumes for `BasicAuth` (it reads
 * `ApiKey`/`ApiSecret`, not `Username`/`Password`), so the label matches the real semantics for every
 * provider that uses this type today (e.g. Bamboo's Client ID / Client Secret), not just one of them.
 */
export const SUPPLIER_AUTH_TYPE_OPTIONS: readonly { label: string; value: SupplierAuthenticationType }[] = [
  { label: 'None', value: 'None' },
  { label: 'API Key', value: 'ApiKey' },
  { label: 'Basic Auth (Client ID / Client Secret)', value: 'BasicAuth' },
  { label: 'Bearer Token', value: 'BearerToken' },
  { label: 'OAuth 2.0', value: 'OAuth2' },
];

/** Providers with a fixed, non-editable HTTP endpoint — the Base URL field is locked to this display value in the UI; the backend independently enforces the real endpoint regardless of what's submitted. */
export const SUPPLIER_FIXED_BASE_URLS: Readonly<Record<string, string>> = {
  Bamboo: 'https://api.bamboocardportal.com',
  Visoria: 'https://api.visoria.digital',
};

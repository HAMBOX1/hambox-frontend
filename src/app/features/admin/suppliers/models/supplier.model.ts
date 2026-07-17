import { PagedResult } from '../../../catalog/models/category.model';

export type SupplierStatus = 'Active' | 'Inactive' | 'Suspended';
export type SupplierAuthenticationType = 'None' | 'ApiKey' | 'BasicAuth' | 'BearerToken' | 'OAuth2';
export type SupplierMappingStatus = 'Active' | 'Inactive';

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
  readonly externalProductId: string;
  readonly externalSku: string | null;
  readonly externalName: string | null;
  readonly buyingPrice: number;
  readonly currency: string;
  readonly priority: number;
  readonly status: SupplierMappingStatus;
  readonly createdOnUtc: string;
}

export interface CreateSupplierMappingRequest {
  internalProductId: string;
  externalProductId: string;
  externalSku: string | null;
  externalName: string | null;
  buyingPrice: number;
  currency: string;
  priority: number;
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

export type SupplierListResult = PagedResult<SupplierListItemDto>;

export const SUPPLIER_STATUS_OPTIONS: readonly { label: string; value: SupplierStatus | 'all' }[] = [
  { label: 'All statuses', value: 'all' },
  { label: 'Active', value: 'Active' },
  { label: 'Inactive', value: 'Inactive' },
  { label: 'Suspended', value: 'Suspended' },
];

export const SUPPLIER_AUTH_TYPE_OPTIONS: readonly { label: string; value: SupplierAuthenticationType }[] = [
  { label: 'None', value: 'None' },
  { label: 'API Key', value: 'ApiKey' },
  { label: 'Basic Auth (Username/Password)', value: 'BasicAuth' },
  { label: 'Bearer Token', value: 'BearerToken' },
  { label: 'OAuth 2.0', value: 'OAuth2' },
];

export interface CommunicationProviderStatusDto {
  readonly channel: string;
  readonly providerType: string;
  readonly isEnabled: boolean;
}

export interface CommunicationDashboardStatsDto {
  readonly notificationsToday: number;
  readonly emailsSentToday: number;
  readonly failuresToday: number;
  readonly retryingCount: number;
  readonly unreadNotifications: number;
  readonly averageDeliverySeconds: number | null;
  readonly queueSize: number;
  readonly providers: readonly CommunicationProviderStatusDto[];
}

export interface CommunicationTemplateListItemDto {
  readonly id: string;
  readonly key: string;
  readonly channel: string;
  readonly category: string;
  readonly hasPublishedVersion: boolean;
  readonly publishedVersionNumber: number | null;
  readonly hasDraft: boolean;
  readonly versionCount: number;
}

export interface CommunicationTemplateVersionDto {
  readonly id: string;
  readonly versionNumber: number;
  readonly subjectEn: string;
  readonly subjectAr: string | null;
  readonly bodyEn: string;
  readonly bodyAr: string | null;
  readonly variablesJson: string | null;
  readonly isPublished: boolean;
  readonly publishedOnUtc: string | null;
  readonly publishedBy: string | null;
}

export interface CommunicationTemplateDetailDto {
  readonly id: string;
  readonly key: string;
  readonly channel: string;
  readonly category: string;
  readonly activeVersionId: string | null;
  readonly versions: readonly CommunicationTemplateVersionDto[];
}

export interface CreateCommunicationTemplateRequest {
  readonly key: string;
  readonly channel: string;
  readonly category: string;
}

export interface UpdateCommunicationTemplateRequest {
  readonly subjectEn: string;
  readonly subjectAr: string | null;
  readonly bodyEn: string;
  readonly bodyAr: string | null;
  readonly variablesJson: string | null;
}

export interface CommunicationMessageListItemDto {
  readonly id: string;
  readonly userId: string;
  readonly channel: string;
  readonly category: string;
  readonly priority: string;
  readonly status: string;
  readonly templateKey: string;
  readonly subject: string;
  readonly retryCount: number;
  readonly lastError: string | null;
  readonly createdOnUtc: string;
  readonly sentOnUtc: string | null;
}

export interface CommunicationProviderConfigDto {
  readonly id: string;
  readonly name: string;
  readonly providerType: string;
  readonly channel: string;
  readonly priority: number;
  readonly isEnabled: boolean;
}

export interface PagedResult<T> {
  readonly items: readonly T[];
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly totalPages: number;
}

export const COMMUNICATION_CATEGORIES = [
  'Order',
  'Membership',
  'Security',
  'Promotion',
  'System',
  'Support',
  'Supplier',
  'Marketing',
  'General',
] as const;

export const COMMUNICATION_CHANNELS = ['InApp', 'Email'] as const;

export const COMMUNICATION_STATUS_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Queued', value: 'Queued' },
  { label: 'Sending', value: 'Sending' },
  { label: 'Sent', value: 'Sent' },
  { label: 'Delivered', value: 'Delivered' },
  { label: 'Failed', value: 'Failed' },
  { label: 'Cancelled', value: 'Cancelled' },
  { label: 'Retrying', value: 'Retrying' },
] as const;

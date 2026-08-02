export interface PagedResult<T> {
  readonly items: readonly T[];
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly totalCount: number;
}

export type SecurityEventType =
  | 'FailedLogin'
  | 'BlockedLogin'
  | 'CountryBlock'
  | 'IpBlock'
  | 'EmailBlock'
  | 'ManualSuspension'
  | 'ManualBan'
  | 'PermissionDenied'
  | 'AdminUnlock'
  | 'AdminBlock'
  | 'DeviceBlock';

export type SecurityEventSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type SecurityEventStatus = 'Open' | 'Acknowledged' | 'Dismissed' | 'Resolved';

export type CountryRestrictionStatus = 'Allowed' | 'Blocked' | 'TemporarilyBlocked';

export interface BlockedUserListItemDto {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly status: string;
  readonly blockReason: string | null;
  readonly blockNotes: string | null;
  readonly blockExpiresOnUtc: string | null;
  readonly blockedOnUtc: string | null;
}

export interface BlockedEmailDto {
  readonly id: string;
  readonly pattern: string;
  readonly isWildcardDomain: boolean;
  readonly reason: string;
  readonly notes: string | null;
  readonly expiresOnUtc: string | null;
  readonly createdOnUtc: string;
}

export interface BlockedIpDto {
  readonly id: string;
  readonly cidrOrAddress: string;
  readonly reason: string;
  readonly notes: string | null;
  readonly expiresOnUtc: string | null;
  readonly createdOnUtc: string;
}

export interface CountryRestrictionDto {
  readonly countryCode: string;
  readonly countryName: string;
  readonly status: CountryRestrictionStatus;
  readonly reason: string | null;
  readonly notes: string | null;
  readonly expiresOnUtc: string | null;
}

export interface SecurityEventDto {
  readonly id: string;
  readonly eventType: SecurityEventType;
  readonly severity: SecurityEventSeverity;
  readonly description: string;
  readonly actorUserId: string | null;
  readonly actorEmail: string | null;
  readonly targetUserId: string | null;
  readonly targetEmail: string | null;
  readonly ipAddress: string | null;
  readonly country: string | null;
  readonly city: string | null;
  readonly userAgent: string | null;
  readonly correlationId: string | null;
  readonly occurredOnUtc: string;
  readonly status: SecurityEventStatus;
  readonly acknowledgedByUserId: string | null;
  readonly acknowledgedOnUtc: string | null;
  readonly resolvedByUserId: string | null;
  readonly resolvedOnUtc: string | null;
  readonly resolutionNotes: string | null;
}

export interface LoginTrendPointDto {
  readonly date: string;
  readonly successfulLogins: number;
  readonly failedLogins: number;
}

export interface CountryFailureCountDto {
  readonly countryCode: string;
  readonly failedLogins: number;
}

/**
 * Meaningful, decision-oriented metrics for the Security Center overview — not a flat list of
 * table-row counts. Every field here is something an owner would act on.
 */
export interface SecurityDashboardDto {
  readonly openAlerts: number;
  readonly failedLoginsLast24h: number;
  readonly failedLoginsPrevious24h: number;
  readonly activeSessions: number;
  readonly newDevicesLast7Days: number;
  readonly loginTrend: readonly LoginTrendPointDto[];
  readonly topFailureCountries: readonly CountryFailureCountDto[];
  readonly openAlertsPreview: readonly SecurityEventDto[];
}

export interface LoginHistoryDto {
  readonly id: string;
  readonly userId: string;
  readonly userEmail: string | null;
  readonly ipAddress: string;
  readonly countryCode: string | null;
  readonly city: string | null;
  readonly browserName: string | null;
  readonly osName: string | null;
  readonly deviceType: string | null;
  readonly isSuccessful: boolean;
  readonly failureReason: string | null;
  readonly riskLevel: SecurityEventSeverity | null;
  readonly occurredOnUtc: string;
}

export interface UserSessionDto {
  readonly id: string;
  readonly authContext: string;
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly browserName: string | null;
  readonly deviceName: string | null;
  readonly startedOnUtc: string;
  readonly lastActivityOnUtc: string;
  readonly endedOnUtc: string | null;
  readonly isActive: boolean;
}

export interface TrustedDeviceDto {
  readonly id: string;
  readonly userId: string;
  readonly userEmail: string | null;
  readonly displayName: string;
  readonly browserName: string | null;
  readonly osName: string | null;
  readonly deviceType: string | null;
  readonly firstSeenUtc: string;
  readonly lastSeenUtc: string;
  readonly lastIpAddress: string;
  readonly lastCountryCode: string | null;
  readonly lastCity: string | null;
  readonly loginCount: number;
  readonly isTrusted: boolean;
  readonly trustedOnUtc: string | null;
  readonly isBlocked: boolean;
  readonly blockedOnUtc: string | null;
  readonly blockReason: string | null;
}

export interface BlockUserRequest {
  readonly reason: string;
  readonly notes?: string | null;
  readonly expiresOnUtc?: string | null;
}

export interface SuspendUserRequest {
  readonly reason: string;
  readonly notes?: string | null;
}

export interface BanUserRequest {
  readonly reason: string;
  readonly notes?: string | null;
}

export interface CreateBlockedEmailRequest {
  readonly pattern: string;
  readonly reason: string;
  readonly notes?: string | null;
  readonly expiresOnUtc?: string | null;
}

export interface CreateBlockedIpRequest {
  readonly cidrOrAddress: string;
  readonly reason: string;
  readonly notes?: string | null;
  readonly expiresOnUtc?: string | null;
}

export interface SetCountryRestrictionRequest {
  readonly status: CountryRestrictionStatus;
  readonly reason: string;
  readonly notes?: string | null;
  readonly expiresOnUtc?: string | null;
}

export interface UpdateSecurityEventStatusRequest {
  readonly status: Exclude<SecurityEventStatus, 'Open'>;
  readonly notes?: string | null;
}

export interface BlockDeviceRequest {
  readonly reason?: string | null;
}

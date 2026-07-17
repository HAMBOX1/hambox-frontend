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
  | 'AdminBlock';

export type SecurityEventSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

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
  readonly userAgent: string | null;
  readonly correlationId: string | null;
  readonly occurredOnUtc: string;
}

export interface SecurityDashboardDto {
  readonly blockedUsers: number;
  readonly suspendedUsers: number;
  readonly blockedEmails: number;
  readonly blockedDomains: number;
  readonly blockedCountries: number;
  readonly blockedIps: number;
  readonly securityEventsToday: number;
  readonly failedLoginsToday: number;
  readonly recentEvents: readonly SecurityEventDto[];
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

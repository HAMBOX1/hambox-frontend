import { jwtDecode } from 'jwt-decode';

import {
  AuthTokenResponse,
  AuthUser,
  HamboxJwtPayload,
  UserSession,
} from '../../features/auth/models/auth';

const ROLE_CLAIM_KEYS = [
  'role',
  'roles',
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
] as const;

const PERMISSION_CLAIM_KEYS = [
  'permission',
  'permissions',
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/permission',
] as const;

export function decodeAccessToken(accessToken: string): HamboxJwtPayload {
  return jwtDecode<HamboxJwtPayload>(accessToken);
}

export function extractClaimValues(
  payload: HamboxJwtPayload,
  keys: readonly string[],
): string[] {
  const values = new Set<string>();

  for (const key of keys) {
    const claimValue = payload[key];

    if (typeof claimValue === 'string' && claimValue.length > 0) {
      values.add(claimValue);
    }

    if (Array.isArray(claimValue)) {
      for (const entry of claimValue) {
        if (typeof entry === 'string' && entry.length > 0) {
          values.add(entry);
        }
      }
    }
  }

  return [...values];
}

export function mapTokenResponseToSession(tokens: AuthTokenResponse): UserSession {
  const payload = decodeAccessToken(tokens.accessToken);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
    user: mapPayloadToUser(payload),
  };
}

export function mapPayloadToUser(payload: HamboxJwtPayload): AuthUser {
  return {
    id: payload.sub,
    email: payload.email,
    firstName: payload.firstName ?? '',
    lastName: payload.lastName ?? '',
    roles: extractClaimValues(payload, ROLE_CLAIM_KEYS),
    permissions: extractClaimValues(payload, PERMISSION_CLAIM_KEYS),
  };
}

export function isAccessTokenExpired(
  accessToken: string,
  expiresAt?: string | null,
  skewSeconds = 30,
): boolean {
  if (expiresAt) {
    const expiresAtMs = Date.parse(expiresAt);
    if (!Number.isNaN(expiresAtMs)) {
      return Date.now() >= expiresAtMs - skewSeconds * 1000;
    }
  }

  try {
    const payload = decodeAccessToken(accessToken);
    return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
  } catch {
    return true;
  }
}

export function hasAdminRole(roles: readonly string[]): boolean {
  return roles.some((role) => role === 'Admin' || role === 'SuperAdmin');
}

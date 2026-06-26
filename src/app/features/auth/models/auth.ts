export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface RegisterRequest {
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
}

export interface RefreshTokenRequest {
  readonly refreshToken: string;
}

export interface LogoutRequest {
  readonly refreshToken: string;
}

export interface ForgotPasswordRequest {
  readonly email: string;
}

export interface ResetPasswordRequest {
  readonly token: string;
  readonly newPassword: string;
}

export interface ResendVerificationRequest {
  readonly email: string;
}

export interface AuthTokenResponse {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
}

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}

export interface UserSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
  readonly user: AuthUser;
}

export interface HamboxJwtPayload {
  readonly sub: string;
  readonly email: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly exp: number;
  readonly role?: string | string[];
  readonly permission?: string | string[];
  readonly 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?:
    | string
    | string[];
  readonly 'http://schemas.microsoft.com/ws/2008/06/identity/claims/permission'?:
    | string
    | string[];
  readonly [claim: string]: unknown;
}

export const ADMIN_ROLES = ['Admin', 'SuperAdmin'] as const;

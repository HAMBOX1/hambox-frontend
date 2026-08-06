export interface LoginRequest {
  readonly email: string;
  readonly password: string;
  readonly rememberMe?: boolean;
}

export interface GoogleLoginRequest {
  readonly idToken: string;
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
  readonly authContext: 'customer' | 'admin';
  readonly user: AuthUser;
}

export interface AdminLoginChallengeResponse {
  readonly challengeId: string;
  readonly expiresAt: string;
  readonly resendAvailableAt: string;
  readonly maskedEmail: string;
  /**
   * Populated only when Admin OTP is disabled via Platform Settings
   * (Authentication.AdminOtpEnabled = false) — the caller is already
   * fully authenticated and should skip the OTP step entirely.
   */
  readonly token?: AuthTokenResponse | null;
}

export interface VerifyAdminOtpRequest {
  readonly challengeId: string;
  readonly code: string;
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
  readonly auth_context?: string;
  readonly otp_verified?: string | boolean;
  readonly session_id?: string;
  readonly [claim: string]: unknown;
}

export { ADMIN_ROLES } from '../../../core/auth/jwt-utils';

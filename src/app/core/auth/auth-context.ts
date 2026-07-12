export type AuthContextType = 'customer' | 'admin';

export const AUTH_CONTEXT = {
  Customer: 'customer' as const,
  Admin: 'admin' as const,
};

export const AUTH_CONTEXT_CLAIM = 'auth_context';
export const OTP_VERIFIED_CLAIM = 'otp_verified';

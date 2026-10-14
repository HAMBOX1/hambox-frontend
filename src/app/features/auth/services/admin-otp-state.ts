export const ADMIN_OTP_CHALLENGE_KEY = 'hambox.admin.otpChallenge';

export interface AdminOtpChallengeState {
  readonly challengeId: string;
  readonly maskedEmail: string;
  readonly expiresAt: string;
  readonly resendAvailableAt: string;
  readonly returnUrl: string;
  /** 'Totp' when the code comes from an authenticator app; absent/'Email' for the e-mailed code. */
  readonly method?: 'Email' | 'Totp';
}

export function saveAdminOtpChallenge(state: AdminOtpChallengeState): void {
  sessionStorage.setItem(ADMIN_OTP_CHALLENGE_KEY, JSON.stringify(state));
}

export function readAdminOtpChallenge(): AdminOtpChallengeState | null {
  const raw = sessionStorage.getItem(ADMIN_OTP_CHALLENGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AdminOtpChallengeState;
  } catch {
    return null;
  }
}

export function clearAdminOtpChallenge(): void {
  sessionStorage.removeItem(ADMIN_OTP_CHALLENGE_KEY);
}

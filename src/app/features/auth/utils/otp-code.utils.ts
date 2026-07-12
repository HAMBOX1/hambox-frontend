/**
 * Normalizes OTP input from text fields or PrimeNG InputOtp (which may bind an array).
 */
export function normalizeOtpCode(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join('').replace(/\D/g, '').slice(0, 6);
  }

  return String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, 6);
}

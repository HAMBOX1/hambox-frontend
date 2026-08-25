import { AuthContextType } from '../core/auth/auth-context';

/** Builds a syntactically valid (unsigned) JWT carrying the claims auth code reads client-side. */
export function fakeJwt(context: AuthContextType, overrides: Record<string, unknown> = {}): string {
  const header = { alg: 'none', typ: 'JWT' };
  const payload = {
    sub: 'user-1',
    email: 'user@example.com',
    firstName: 'Test',
    lastName: 'User',
    auth_context: context,
    otp_verified: context === 'admin' ? 'true' : undefined,
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
  const encode = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/=+$/, '');
  return `${encode(header)}.${encode(payload)}.signature`;
}

import {
  HAMBOX_API_BASE_URL,
  HAMBOX_GOOGLE_CLIENT_ID,
  HAMBOX_TURNSTILE_SITE_KEY,
} from './api-url';

export const environment = {
  production: true,
  apiUrl: HAMBOX_API_BASE_URL,
  /** Google OAuth client ID. Empty disables the Google Sign-In button. */
  googleClientId: HAMBOX_GOOGLE_CLIENT_ID,
  /** Cloudflare Turnstile site key. Not secret — safe to expose to the frontend. */
  turnstileSiteKey: HAMBOX_TURNSTILE_SITE_KEY,
} as const;

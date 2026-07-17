import { HAMBOX_API_BASE_URL, HAMBOX_GOOGLE_CLIENT_ID } from './api-url';

export const environment = {
  production: true,
  apiUrl: HAMBOX_API_BASE_URL,
  /** Google OAuth client ID. Empty disables the Google Sign-In button. */
  googleClientId: HAMBOX_GOOGLE_CLIENT_ID,
} as const;

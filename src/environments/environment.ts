export const environment = {
  production: false,
  /** Empty = `/api` proxied to the URL in `api-url.json` during `ng serve`. */
  apiUrl: '',
  /** Google OAuth client ID. Empty disables the Google Sign-In button. */
  googleClientId: '696726585151-8kre2rveud0lcf08dtvcbpmlp1uutq46.apps.googleusercontent.com',
  /**
   * Cloudflare Turnstile site key — not secret, safe to commit (Cloudflare's widget embeds it in page
   * HTML). This is Cloudflare's official "always passes" testing key for local development; the backend
   * dev config (`appsettings.Development.json`) pairs it with the matching test secret key.
   * https://developers.cloudflare.com/turnstile/troubleshooting/testing/
   */
  turnstileSiteKey: '1x00000000000000000000AA',
} as const;

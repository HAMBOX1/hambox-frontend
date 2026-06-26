import apiUrlConfig from './api-url.json';

/**
 * HAMBOX API base URL — change `api-url.json` when switching backends.
 *
 * Dev (`ng serve`): `environment.ts` uses an empty `apiUrl` so `/api` is proxied
 * to this URL (see `proxy.conf.js`). Production builds use this value directly.
 */
export const HAMBOX_API_BASE_URL = apiUrlConfig.baseUrl;

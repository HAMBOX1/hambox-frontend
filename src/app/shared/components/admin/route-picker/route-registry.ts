/**
 * Curated, linkable storefront destinations for `RoutePickerComponent` — the CMS-style "pick a page"
 * list for button/link fields across the Page Builder and admin dashboard. Sourced by hand from
 * `app.routes.ts` and each feature's `*.routes.ts` (not walked from the live `Router` config: every
 * storefront route is lazy-loaded, so introspecting it at runtime would force-load every feature
 * chunk just to list page names).
 *
 * Add one entry here when a new top-level storefront/account page ships — that's the only place a new
 * route needs registering for it to appear in every route picker in the app.
 */
export interface AppRouteOption {
  readonly labelKey: string;
  readonly path: string;
  readonly group: 'STOREFRONT' | 'ACCOUNT' | 'INFO';
}

const KEY = (path: string) => `ADMIN.PICKERS.ROUTE_PICKER.ROUTES.${path}`;

export const APP_ROUTE_REGISTRY: readonly AppRouteOption[] = [
  { labelKey: KEY('HOME'), path: '/home', group: 'STOREFRONT' },
  { labelKey: KEY('PRODUCTS'), path: '/products', group: 'STOREFRONT' },
  { labelKey: KEY('CART'), path: '/cart', group: 'STOREFRONT' },
  { labelKey: KEY('CHECKOUT'), path: '/checkout', group: 'STOREFRONT' },
  { labelKey: KEY('MEMBERSHIP_CHECKOUT'), path: '/checkout/membership', group: 'STOREFRONT' },
  { labelKey: KEY('SUPPORT_CHAT'), path: '/support-chat', group: 'STOREFRONT' },
  { labelKey: KEY('LEGAL'), path: '/legal', group: 'INFO' },

  { labelKey: KEY('DASHBOARD'), path: '/account/dashboard', group: 'ACCOUNT' },
  { labelKey: KEY('LIBRARY'), path: '/account/library', group: 'ACCOUNT' },
  { labelKey: KEY('ORDERS'), path: '/account/orders', group: 'ACCOUNT' },
  { labelKey: KEY('WISHLIST'), path: '/account/wishlist', group: 'ACCOUNT' },
  { labelKey: KEY('MEMBERSHIP'), path: '/account/membership', group: 'ACCOUNT' },
  { labelKey: KEY('REFERRAL'), path: '/account/referral', group: 'ACCOUNT' },
  { labelKey: KEY('NOTIFICATIONS'), path: '/account/notifications', group: 'ACCOUNT' },
  { labelKey: KEY('PROFILE'), path: '/account/profile', group: 'ACCOUNT' },
  { labelKey: KEY('SUPPORT'), path: '/account/support', group: 'ACCOUNT' },
];

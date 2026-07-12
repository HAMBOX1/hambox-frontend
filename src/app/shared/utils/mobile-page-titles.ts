import { computed } from '@angular/core';

export interface MobilePageTitleRule {
  readonly match: (url: string) => boolean;
  readonly titleKey: string;
}

const MOBILE_PAGE_TITLE_RULES: readonly MobilePageTitleRule[] = [
  { match: (url) => /^\/account\/orders\/[^/]+/.test(url), titleKey: 'MOBILE_NAV.ORDER_DETAIL' },
  { match: (url) => url.startsWith('/account/dashboard'), titleKey: 'ACCOUNT.DASHBOARD' },
  { match: (url) => url.startsWith('/account/library'), titleKey: 'ACCOUNT_MENU.LIBRARY' },
  { match: (url) => url.startsWith('/account/orders'), titleKey: 'ACCOUNT_MENU.ORDERS' },
  { match: (url) => url.startsWith('/account/membership'), titleKey: 'ACCOUNT_MENU.MEMBERSHIP' },
  { match: (url) => url.startsWith('/account/wishlist'), titleKey: 'ACCOUNT_MENU.WISHLIST' },
  { match: (url) => url.startsWith('/account/notifications'), titleKey: 'ACCOUNT_MENU.NOTIFICATIONS' },
  { match: (url) => url.startsWith('/account/profile'), titleKey: 'ACCOUNT_MENU.SETTINGS' },
  { match: (url) => url.startsWith('/account/referral'), titleKey: 'ACCOUNT.REFERRAL' },
  { match: (url) => url.startsWith('/account'), titleKey: 'MOBILE_NAV.ACCOUNT' },
  { match: (url) => /^\/products\/[^/]+/.test(url), titleKey: 'MOBILE_NAV.PRODUCT_DETAILS' },
  { match: (url) => url.startsWith('/cart'), titleKey: 'MOBILE_NAV.CART' },
  { match: (url) => url.startsWith('/checkout/success'), titleKey: 'MOBILE_NAV.ORDER_SUCCESS' },
  { match: (url) => url.startsWith('/checkout'), titleKey: 'MOBILE_NAV.CHECKOUT' },
  { match: (url) => url.startsWith('/support-chat'), titleKey: 'MOBILE_NAV.SUPPORT' },
];

export function resolveMobilePageTitleKey(url: string): string | null {
  const rule = MOBILE_PAGE_TITLE_RULES.find((entry) => entry.match(url));
  return rule?.titleKey ?? null;
}

export function isMobileAccountArea(url: string): boolean {
  return url.startsWith('/account');
}

export function shouldShowMobilePageTitle(url: string): boolean {
  return (
    isMobileAccountArea(url) ||
    /^\/products\/[^/]+/.test(url) ||
    url.startsWith('/cart') ||
    url.startsWith('/checkout') ||
    url.startsWith('/support-chat')
  );
}

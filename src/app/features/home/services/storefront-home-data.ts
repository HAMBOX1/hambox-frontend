import { NavLink, TrustFeature } from '../models/storefront-home';

export const STOREFRONT_NAV_LINKS: readonly NavLink[] = [
  { labelKey: 'NAVBAR.CATEGORIES.GAMES', route: '/products', active: true },
  { labelKey: 'NAVBAR.CATEGORIES.GIFT_CARDS', route: '/products' },
  { labelKey: 'NAVBAR.CATEGORIES.SUBSCRIPTIONS', route: '/products' },
  { labelKey: 'NAVBAR.CATEGORIES.DEALS', route: '/products' },
];

export const STOREFRONT_TRUST_FEATURES: readonly TrustFeature[] = [
  {
    iconSrc: 'assets/images/trust/instant-delivery.svg',
    titleKey: 'HOME.TRUST.INSTANT_TITLE',
    descriptionKey: 'HOME.TRUST.INSTANT_DESC',
  },
  {
    iconSrc: 'assets/images/trust/secure-payment.svg',
    titleKey: 'HOME.TRUST.SECURE_TITLE',
    descriptionKey: 'HOME.TRUST.SECURE_DESC',
  },
  {
    iconSrc: 'assets/images/trust/support.svg',
    titleKey: 'HOME.TRUST.SUPPORT_TITLE',
    descriptionKey: 'HOME.TRUST.SUPPORT_DESC',
  },
];

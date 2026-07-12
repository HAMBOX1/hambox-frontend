import { NavLink } from '../models/storefront-home';

export const STOREFRONT_NAV_LINKS: readonly NavLink[] = [
  { labelKey: 'NAVBAR.CATEGORIES.GAMES', route: '/products', section: 'games' },
  { labelKey: 'NAVBAR.CATEGORIES.GIFT_CARDS', route: '/products', section: 'gift-cards' },
  { labelKey: 'NAVBAR.CATEGORIES.SUBSCRIPTIONS', route: '/products', section: 'subscriptions' },
  { labelKey: 'NAVBAR.CATEGORIES.DEALS', route: '/products', section: 'deals' },
];

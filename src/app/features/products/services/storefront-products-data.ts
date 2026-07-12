import { NavLink } from '../../home/models/storefront-home';
import { StoreCategoryPill, StoreSortOption } from '../models/product';
import { ProductDetailsRedeemStep, ProductDetailsTrustFeature } from '../../product-details/models/product-details';

export const DEFAULT_PRODUCT_DETAILS_EXTRAS = {
  trustFeatures: [
    { iconSrc: 'assets/images/trust/instant-delivery.svg', label: 'INSTANT EMAIL' },
    { iconSrc: 'assets/images/trust/secure-payment.svg', label: '100% SECURE' },
    { iconSrc: 'assets/images/trust/support.svg', label: '24/7 SUPPORT' },
  ] as const satisfies readonly ProductDetailsTrustFeature[],
  redeemSteps: [
    {
      id: 'receive-code',
      title: '1. Receive Code',
      description: 'Your digital code is delivered instantly to your registered email after purchase.',
    },
    {
      id: 'open-platform',
      title: '2. Open Platform',
      description: 'Sign in to the relevant platform store or redemption page for your product.',
    },
    {
      id: 'redeem',
      title: '3. Redeem',
      description: 'Enter the code from your email and complete redemption to access your purchase.',
    },
  ] as const satisfies readonly ProductDetailsRedeemStep[],
};

export const STOREFRONT_PRODUCTS_NAV_LINKS: readonly NavLink[] = [
  { labelKey: 'NAVBAR.CATEGORIES.GAMES', route: '/products', section: 'games' },
  { labelKey: 'NAVBAR.CATEGORIES.GIFT_CARDS', route: '/products', section: 'gift-cards' },
  { labelKey: 'NAVBAR.CATEGORIES.SUBSCRIPTIONS', route: '/products', section: 'subscriptions' },
  { labelKey: 'NAVBAR.CATEGORIES.DEALS', route: '/products', section: 'deals' },
];

export const STOREFRONT_CATEGORY_PILLS: readonly StoreCategoryPill[] = [
  { id: 'all', label: 'All Items' },
  { id: 'action', label: 'Action' },
  { id: 'rpg', label: 'RPG' },
  { id: 'strategy', label: 'Strategy' },
];

export const STOREFRONT_SORT_OPTIONS: readonly StoreSortOption[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'best-selling', label: 'Best Selling' },
  { value: 'rating-desc', label: 'Highest Rated' },
  { value: 'alphabetical', label: 'Alphabetical' },
];


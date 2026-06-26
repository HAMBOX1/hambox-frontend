import { NavLink } from '../../home/models/storefront-home';
import {
  StoreCategoryPill,
  StorePlatformFilter,
  StorePromoBanner,
  StoreSortOption,
} from '../models/product';
import { ProductDetailsRedeemStep, ProductDetailsTrustFeature } from '../../product-details/models/product-details';
import { StorefrontSelectOption } from '../../../shared/components/storefront-field-select/storefront-field-select.component';

export const DEFAULT_PRODUCT_DETAILS_EXTRAS = {
  regions: [
    { value: 'us', label: '🇺🇸 US' },
    { value: 'uk', label: '🇬🇧 UK' },
    { value: 'uae', label: '🇦🇪 UAE' },
    { value: 'global', label: '🌐 GLOBAL' },
  ] as const satisfies readonly StorefrontSelectOption[],
  values: [
    { value: '10', label: '$10' },
    { value: '25', label: '$25' },
    { value: '50', label: '$50' },
    { value: '75', label: '$75' },
    { value: '100', label: '$100' },
  ] as const satisfies readonly StorefrontSelectOption[],
  defaultRegion: 'global',
  defaultValue: '50',
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
  { labelKey: 'NAVBAR.CATEGORIES.GAMES', route: '/products', active: true },
  { labelKey: 'NAVBAR.CATEGORIES.GIFT_CARDS', route: '/products' },
  { labelKey: 'NAVBAR.CATEGORIES.SUBSCRIPTIONS', route: '/products' },
  { labelKey: 'NAVBAR.CATEGORIES.DEALS', route: '/products' },
];

export const STOREFRONT_CATEGORY_PILLS: readonly StoreCategoryPill[] = [
  { id: 'all', label: 'All Items' },
  { id: 'action', label: 'Action' },
  { id: 'rpg', label: 'RPG' },
  { id: 'strategy', label: 'Strategy' },
];

export const STOREFRONT_SORT_OPTIONS: readonly StoreSortOption[] = [
  { value: 'popular', label: 'Popular' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
];

export const STOREFRONT_PLATFORM_FILTERS: readonly StorePlatformFilter[] = [
  { id: 'xbox', label: 'Xbox', dotColor: '#107c10', checked: true },
  { id: 'playstation', label: 'PlayStation', dotColor: '#003791', checked: false },
  { id: 'pc', label: 'PC', dotColor: '#e5e2e3', checked: false },
];

export const STOREFRONT_PROMO_BANNER: StorePromoBanner = {
  headline: 'Cyberpunk Sale Event',
  subheadline: 'Up to 80% off premium digital titles. Instant global delivery.',
  backgroundImageUrl: 'assets/images/hambox-hero-background.png',
  initialCountdownSeconds: 4 * 3600 + 45 * 60 + 12,
};

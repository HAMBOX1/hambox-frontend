export const CATALOG_API = {
  categories: '/api/v1/categories',
  products: '/api/v1/products',
  productImages: (productId: string) => `/api/v1/products/${productId}/images`,
  productImage: (productId: string, imageId: string) => `/api/v1/products/${productId}/images/${imageId}`,
  productImagePrimary: (productId: string, imageId: string) =>
    `/api/v1/products/${productId}/images/${imageId}/primary`,
  productImagesReorder: (productId: string) => `/api/v1/products/${productId}/images/reorder`,
  storefrontContent: '/api/v1/storefront/content',
} as const;

export const COMMERCE_API = {
  cart: '/api/v1/cart',
  cartItems: '/api/v1/cart/items',
  cartItem: (productId: string) => `/api/v1/cart/items/${productId}`,
  mergeCart: '/api/v1/cart/merge',
  checkout: '/api/v1/checkout',
  order: (orderId: string) => `/api/v1/orders/${orderId}`,
} as const;

export const GUEST_CART_HEADER = 'X-Guest-Cart-Id';

export const LOCALIZATION_API = {
  currencies: '/api/v1/localization/currencies',
  exchangeRates: '/api/v1/localization/exchange-rates',
} as const;

export const AUTH_API = {
  register: '/api/auth/register',
  login: '/api/auth/login',
  refresh: '/api/auth/refresh',
  logout: '/api/auth/logout',
  verifyEmail: '/api/auth/verify-email',
  forgotPassword: '/api/auth/forgot-password',
  resetPassword: '/api/auth/reset-password',
  resendVerification: '/api/auth/resend-verification',
  me: '/api/auth/me',
  changePassword: '/api/auth/change-password',
} as const;

export const ACCOUNT_API = {
  dashboard: '/api/v1/account/dashboard',
  wishlist: '/api/v1/account/wishlist',
  wishlistItem: (productId: string) => `/api/v1/account/wishlist/${productId}`,
  moveWishlistToCart: (productId: string) => `/api/v1/account/wishlist/${productId}/move-to-cart`,
  orders: '/api/v1/account/orders',
  order: (orderId: string) => `/api/v1/account/orders/${orderId}`,
  productReviews: (productId: string) => `/api/v1/account/products/${productId}/reviews`,
  myReviews: '/api/v1/account/reviews/mine',
  reviews: '/api/v1/account/reviews',
  review: (reviewId: string) => `/api/v1/account/reviews/${reviewId}`,
  notifications: '/api/v1/account/notifications',
  unreadCount: '/api/v1/account/notifications/unread-count',
  markNotificationRead: (id: string) => `/api/v1/account/notifications/${id}/read`,
  markAllNotificationsRead: '/api/v1/account/notifications/read-all',
  referral: '/api/v1/account/referral',
  referralHistory: '/api/v1/account/referral/history',
} as const;

export const CATALOG_API = {
  categories: '/api/v1/categories',
  categoriesTree: '/api/v1/categories/tree',
  categoriesReorder: '/api/v1/categories/reorder',
  category: (id: string) => `/api/v1/categories/${id}`,
  categoryRestore: (id: string) => `/api/v1/categories/${id}/restore`,
  categoryImage: (id: string) => `/api/v1/categories/${id}/image`,
  collections: '/api/v1/collections',
  collectionsTree: '/api/v1/collections/tree',
  collectionsReorder: '/api/v1/collections/reorder',
  collection: (id: string) => `/api/v1/collections/${id}`,
  collectionRestore: (id: string) => `/api/v1/collections/${id}/restore`,
  products: '/api/v1/products',
  productFacets: '/api/v1/products/facets',
  product: (id: string) => `/api/v1/products/${id}`,
  productPublish: (id: string) => `/api/v1/products/${id}/publish`,
  productDeactivate: (id: string) => `/api/v1/products/${id}/deactivate`,
  productArchive: (id: string) => `/api/v1/products/${id}/archive`,
  productRestore: (id: string) => `/api/v1/products/${id}/restore`,
  productDuplicate: (id: string) => `/api/v1/products/${id}/duplicate`,
  productCategory: (id: string) => `/api/v1/products/${id}/category`,
  productPrice: (id: string) => `/api/v1/products/${id}/price`,
  productsBulk: '/api/v1/products/bulk',
  productsBulkDelete: '/api/v1/products/bulk-delete',
  productsBulkDuplicate: '/api/v1/products/bulk-duplicate',
  productsBulkExport: '/api/v1/products/bulk-export',
  productImages: (productId: string) => `/api/v1/products/${productId}/images`,
  productImage: (productId: string, imageId: string) => `/api/v1/products/${productId}/images/${imageId}`,
  productImagePrimary: (productId: string, imageId: string) =>
    `/api/v1/products/${productId}/images/${imageId}/primary`,
  productImagesReorder: (productId: string) => `/api/v1/products/${productId}/images/reorder`,
  productInstructions: (productId: string) => `/api/v1/products/${productId}/instructions`,
  productInstructionsPublish: (productId: string) => `/api/v1/products/${productId}/instructions/publish`,
  productInstructionsUnpublish: (productId: string) => `/api/v1/products/${productId}/instructions/unpublish`,
  productInstructionsImages: (productId: string) => `/api/v1/products/${productId}/instructions/images`,
  storefrontContent: '/api/v1/storefront/content',
  storefrontProductConfiguration: (productId: string) =>
    `/api/v1/storefront/products/${productId}/configuration`,
  storefrontProductConfigurationPreview: (productId: string) =>
    `/api/v1/storefront/products/${productId}/configuration/preview`,
} as const;

export const PAGE_BUILDER_API = {
  published: '/api/v1/page-builder/published',
  publishedFooter: '/api/v1/page-builder/published/footer',
  templates: '/api/v1/page-builder/templates',
  template: (id: string) => `/api/v1/page-builder/templates/${id}`,
  templateDraft: (id: string) => `/api/v1/page-builder/templates/${id}/draft`,
  templatePublish: (id: string) => `/api/v1/page-builder/templates/${id}/publish`,
  templateDiscardDraft: (id: string) => `/api/v1/page-builder/templates/${id}/discard-draft`,
  templateActivate: (id: string) => `/api/v1/page-builder/templates/${id}/activate`,
  templateImages: '/api/v1/page-builder/templates/images',
} as const;

export const CATALOG_IMPORT_EXPORT_API = {
  export: '/api/v1/catalog/export',
  importTemplate: (entityType: string) => `/api/v1/catalog/import/templates/${entityType}`,
  importUpload: '/api/v1/catalog/import/upload',
  importValidate: (uploadId: string) => `/api/v1/catalog/import/${uploadId}/validate`,
  importExecute: (uploadId: string) => `/api/v1/catalog/import/${uploadId}/execute`,
  importLookups: '/api/v1/catalog/import/lookups',
  jobs: '/api/v1/catalog/import-export/jobs',
  job: (jobId: string) => `/api/v1/catalog/import-export/jobs/${jobId}`,
  jobDownload: (jobId: string) => `/api/v1/catalog/import-export/jobs/${jobId}/download`,
} as const;

export const INVENTORY_API = {
  statistics: '/api/v1/inventory/statistics',
  productVariants: (productId: string) => `/api/v1/inventory/products/${productId}/variants`,
  generateProductVariants: (productId: string) =>
    `/api/v1/inventory/products/${productId}/variants/generate`,
  bulkUpdateProductVariants: (productId: string) =>
    `/api/v1/inventory/products/${productId}/variants/bulk-update`,
  activateProductVariants: (productId: string) => `/api/v1/inventory/products/${productId}/variants/activate`,
  bulkDeleteProductVariants: (productId: string) =>
    `/api/v1/inventory/products/${productId}/variants/bulk-delete`,
  bulkDuplicateProductVariants: (productId: string) =>
    `/api/v1/inventory/products/${productId}/variants/bulk-duplicate`,
  bulkExportProductVariantCodes: (productId: string) =>
    `/api/v1/inventory/products/${productId}/variants/codes/export`,
  variant: (variantId: string) => `/api/v1/inventory/variants/${variantId}`,
  variantDuplicate: (variantId: string) => `/api/v1/inventory/variants/${variantId}/duplicate`,
  variantActivate: (variantId: string) => `/api/v1/inventory/variants/${variantId}/activate`,
  variantDeactivate: (variantId: string) => `/api/v1/inventory/variants/${variantId}/deactivate`,
  productOptionGroups: (productId: string) => `/api/v1/inventory/products/${productId}/option-groups`,
  productOptionGroupsReorder: (productId: string) =>
    `/api/v1/inventory/products/${productId}/option-groups/reorder`,
  optionGroup: (groupId: string) => `/api/v1/inventory/option-groups/${groupId}`,
  optionGroupOptions: (groupId: string) => `/api/v1/inventory/option-groups/${groupId}/options`,
  optionGroupOptionsReorder: (groupId: string) =>
    `/api/v1/inventory/option-groups/${groupId}/options/reorder`,
  option: (optionId: string) => `/api/v1/inventory/options/${optionId}`,
  suppliers: '/api/v1/inventory/suppliers',
  variantBatches: (variantId: string) => `/api/v1/inventory/variants/${variantId}/batches`,
  batchImport: (variantId: string, batchId: string) =>
    `/api/v1/inventory/variants/${variantId}/batches/${batchId}/import`,
  variantCodes: (variantId: string) => `/api/v1/inventory/variants/${variantId}/codes`,
  variantCodesExport: (variantId: string) => `/api/v1/inventory/variants/${variantId}/codes/export`,
  variantCodesBulkDisable: (variantId: string) =>
    `/api/v1/inventory/variants/${variantId}/codes/bulk-disable`,
  variantCodesBulkDelete: (variantId: string) =>
    `/api/v1/inventory/variants/${variantId}/codes/bulk-delete`,
  code: (codeId: string) => `/api/v1/inventory/codes/${codeId}`,
  codeDisable: (codeId: string) => `/api/v1/inventory/codes/${codeId}/disable`,
  codeEnable: (codeId: string) => `/api/v1/inventory/codes/${codeId}/enable`,
  codeReveal: (codeId: string) => `/api/v1/inventory/codes/${codeId}/reveal`,
  auditLogs: '/api/v1/inventory/audit-logs',
  reservations: '/api/v1/inventory/reservations',
  releaseReservation: (codeId: string) => `/api/v1/inventory/reservations/${codeId}/release`,
} as const;

export const COMMERCE_API = {
  cart: '/api/v1/cart',
  cartItems: '/api/v1/cart/items',
  cartItem: (productId: string, variantId?: string | null) =>
    variantId
      ? `/api/v1/cart/items/${productId}?variantId=${variantId}`
      : `/api/v1/cart/items/${productId}`,
  mergeCart: '/api/v1/cart/merge',
  checkout: '/api/v1/checkout',
  membershipCheckoutPreview: '/api/v1/checkout/membership/preview',
  membershipCheckout: '/api/v1/checkout/membership',
  checkoutConfiguration: '/api/v1/checkout/configuration',
  order: (orderId: string) => `/api/v1/orders/${orderId}`,
  cartPromotionsApply: '/api/v1/cart/promotions/apply',
  cartPromotions: '/api/v1/cart/promotions',
} as const;

export const GUEST_CART_HEADER = 'X-Guest-Cart-Id';

export const LOCALIZATION_API = {
  currencies: '/api/v1/localization/currencies',
  exchangeRates: '/api/v1/localization/exchange-rates',
} as const;

export const AUTH_API = {
  register: '/api/auth/register',
  login: '/api/auth/login',
  google: '/api/auth/google',
  adminLogin: '/api/auth/admin/login',
  adminVerifyOtp: '/api/auth/admin/verify-otp',
  adminResendOtp: '/api/auth/admin/resend-otp',
  maintenanceBypass: '/api/auth/maintenance-bypass',
  sessions: '/api/auth/sessions',
  revokeAllSessions: '/api/auth/sessions/revoke-all',
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
  archiveNotification: (id: string) => `/api/v1/account/notifications/${id}/archive`,
  deleteNotification: (id: string) => `/api/v1/account/notifications/${id}`,
  referral: '/api/v1/account/referral',
  referralHistory: '/api/v1/account/referral/history',
  membership: '/api/v1/account/membership',
  membershipHistory: '/api/v1/account/membership/history',
  membershipTransactions: '/api/v1/account/membership/transactions',
  membershipUpgrade: '/api/v1/account/membership/upgrade',
  membershipDowngrade: '/api/v1/account/membership/downgrade',
  membershipRenew: '/api/v1/account/membership/renew',
  membershipSubscribe: '/api/v1/account/membership/subscribe',
  library: '/api/v1/account/library',
  revealLibraryKey: (id: string) => `/api/v1/account/library/${id}/reveal`,
  libraryItemInstructions: (orderItemId: string) => `/api/v1/account/library/${orderItemId}/instructions`,
  wallet: '/api/v1/account/wallet',
} as const;

export const THEMES_API = {
  active: '/api/v1/themes/active',
  preview: (token: string) => `/api/v1/themes/preview/${token}`,
  themes: '/api/v1/themes',
  statistics: '/api/v1/themes/statistics',
  templates: '/api/v1/themes/templates',
  theme: (themeId: string) => `/api/v1/themes/${themeId}`,
  duplicate: (themeId: string) => `/api/v1/themes/${themeId}/duplicate`,
  publish: (themeId: string) => `/api/v1/themes/${themeId}/publish`,
  archive: (themeId: string) => `/api/v1/themes/${themeId}/archive`,
  rollback: (themeId: string) => `/api/v1/themes/${themeId}/rollback`,
  previewSession: (themeId: string) => `/api/v1/themes/${themeId}/preview`,
  schedule: (themeId: string) => `/api/v1/themes/${themeId}/schedule`,
  assign: (themeId: string) => `/api/v1/themes/${themeId}/assign`,
  assets: (themeId: string) => `/api/v1/themes/${themeId}/assets`,
  history: (themeId: string) => `/api/v1/themes/${themeId}/history`,
  compare: '/api/v1/themes/compare',
  export: (themeId: string) => `/api/v1/themes/${themeId}/export`,
  import: '/api/v1/themes/import',
} as const;

export const DASHBOARD_API = {
  overview: '/api/v1/dashboard',
} as const;

export const OPERATIONS_API = {
  dashboard: '/api/v1/operations/dashboard',
  jobs: '/api/v1/operations/jobs',
  job: (id: string) => `/api/v1/operations/jobs/${id}`,
  jobHistory: (id: string) => `/api/v1/operations/jobs/${id}/history`,
  retryJob: (id: string) => `/api/v1/operations/jobs/${id}/retry`,
  retryAllJobs: '/api/v1/operations/jobs/retry-all',
  cancelJob: (id: string) => `/api/v1/operations/jobs/${id}/cancel`,
  clearCompleted: '/api/v1/operations/jobs/clear-completed',
  recurringJobs: '/api/v1/operations/recurring-jobs',
  delivery: '/api/v1/operations/delivery',
  retryDelivery: (orderId: string) => `/api/v1/operations/delivery/${orderId}/retry`,
  suppliers: '/api/v1/operations/suppliers',
  apiLogs: '/api/v1/operations/api-logs',
  health: '/api/v1/operations/health',
  alerts: '/api/v1/operations/alerts',
  acknowledgeAlert: (id: string) => `/api/v1/operations/alerts/${id}/acknowledge`,
  export: '/api/v1/operations/export',
} as const;

export const ANALYTICS_API = {
  overview: '/api/v1/analytics/overview',
  revenue: '/api/v1/analytics/revenue',
  orders: '/api/v1/analytics/orders',
  products: '/api/v1/analytics/products',
  categories: '/api/v1/analytics/categories',
  customers: '/api/v1/analytics/customers',
  memberships: '/api/v1/analytics/memberships',
  promotions: '/api/v1/analytics/promotions',
  referrals: '/api/v1/analytics/referrals',
  search: '/api/v1/analytics/search',
  operations: '/api/v1/analytics/operations',
  export: '/api/v1/analytics/export',
} as const;

export const REPORTS_API = {
  types: '/api/v1/reports/types',
  library: '/api/v1/reports/library',
  definitions: '/api/v1/reports/definitions',
  definition: (id: string) => `/api/v1/reports/definitions/${id}`,
  favorites: '/api/v1/reports/favorites',
  favorite: (definitionId: string) => `/api/v1/reports/favorites/${definitionId}`,
  downloads: '/api/v1/reports/downloads',
  generate: '/api/v1/reports/generate',
  schedules: '/api/v1/reports/schedules',
  schedule: (id: string) => `/api/v1/reports/schedules/${id}`,
  runSchedule: (id: string) => `/api/v1/reports/schedules/${id}/run`,
  scheduleExecutions: (id: string) => `/api/v1/reports/schedules/${id}/executions`,
} as const;

export const ORDERS_API = {
  orders: '/api/v1/orders',
  statistics: '/api/v1/orders/statistics',
  bulk: '/api/v1/orders/bulk',
  order: (orderId: string) => `/api/v1/orders/${orderId}/manage`,
  status: (orderId: string) => `/api/v1/orders/${orderId}/status`,
  refund: (orderId: string) => `/api/v1/orders/${orderId}/refund`,
  resendCodes: (orderId: string) => `/api/v1/orders/${orderId}/resend-codes`,
  retryFulfillment: (orderId: string) => `/api/v1/orders/${orderId}/fulfillment/retry`,
  manualCode: (orderId: string) => `/api/v1/orders/${orderId}/manual-code`,
  notes: (orderId: string) => `/api/v1/orders/${orderId}/notes`,
  note: (orderId: string, noteId: string) => `/api/v1/orders/${orderId}/notes/${noteId}`,
  revealLicenseKey: (orderId: string, licenseKeyId: string) =>
    `/api/v1/orders/${orderId}/license-keys/${licenseKeyId}/reveal`,
} as const;

export const PROMOTIONS_API = {
  promotions: '/api/v1/promotions',
  promotion: (promotionId: string) => `/api/v1/promotions/${promotionId}`,
  statistics: (promotionId: string) => `/api/v1/promotions/${promotionId}/statistics`,
  duplicate: (promotionId: string) => `/api/v1/promotions/${promotionId}/duplicate`,
  publish: (promotionId: string) => `/api/v1/promotions/${promotionId}/publish`,
  activate: (promotionId: string) => `/api/v1/promotions/${promotionId}/activate`,
  deactivate: (promotionId: string) => `/api/v1/promotions/${promotionId}/deactivate`,
  archive: (promotionId: string) => `/api/v1/promotions/${promotionId}/archive`,
  generateCoupons: (promotionId: string) => `/api/v1/promotions/${promotionId}/coupons/generate`,
  coupons: (promotionId: string) => `/api/v1/promotions/${promotionId}/coupons`,
  redemptions: (promotionId: string) => `/api/v1/promotions/${promotionId}/redemptions`,
} as const;

export const ROLES_API = {
  roles: '/api/v1/roles',
  role: (roleId: string) => `/api/v1/roles/${roleId}`,
  permissionMatrix: '/api/v1/roles/permissions/matrix',
  permissions: (roleId: string) => `/api/v1/roles/${roleId}/permissions`,
  duplicate: (roleId: string) => `/api/v1/roles/${roleId}/duplicate`,
  roleUsers: (roleId: string) => `/api/v1/roles/${roleId}/users`,
  roleUser: (roleId: string, userId: string) => `/api/v1/roles/${roleId}/users/${userId}`,
  userSearch: '/api/v1/roles/users/search',
} as const;

export const MEMBERSHIPS_API = {
  plans: '/api/v1/memberships/plans',
  plan: (planId: string) => `/api/v1/memberships/plans/${planId}`,
  statistics: '/api/v1/memberships/statistics',
  compare: '/api/v1/memberships/plans/compare',
  duplicate: (planId: string) => `/api/v1/memberships/plans/${planId}/duplicate`,
  archive: (planId: string) => `/api/v1/memberships/plans/${planId}/archive`,
  activate: (planId: string) => `/api/v1/memberships/plans/${planId}/activate`,
  assign: '/api/v1/memberships/assign',
  assignBulk: '/api/v1/memberships/assign/bulk',
  renewSubscription: (subscriptionId: string) =>
    `/api/v1/memberships/subscriptions/${subscriptionId}/renew`,
  upgradeSubscription: (subscriptionId: string) =>
    `/api/v1/memberships/subscriptions/${subscriptionId}/upgrade`,
  downgradeSubscription: (subscriptionId: string) =>
    `/api/v1/memberships/subscriptions/${subscriptionId}/downgrade`,
  cancelSubscription: (subscriptionId: string) =>
    `/api/v1/memberships/subscriptions/${subscriptionId}/cancel`,
  members: '/api/v1/memberships/members',
} as const;

export const SETTINGS_API = {
  settings: '/api/v1/settings',
  audit: '/api/v1/settings/audit',
  category: (key: string) => `/api/v1/settings/${key}`,
  restore: (key: string) => `/api/v1/settings/${key}/restore-defaults`,
  testEmail: '/api/v1/settings/email/test',
  publicSettings: '/api/v1/platform-settings',
} as const;

export const LEGAL_API = {
  documents: '/api/v1/legal/documents',
  document: (slug: string) => `/api/v1/legal/documents/${slug}`,
  update: (slug: string) => `/api/v1/legal/documents/${slug}`,
  publish: (slug: string) => `/api/v1/legal/documents/${slug}/publish`,
  history: (slug: string) => `/api/v1/legal/documents/${slug}/history`,
  archive: (slug: string) => `/api/v1/legal/documents/${slug}/archive`,
  duplicate: (slug: string) => `/api/v1/legal/documents/${slug}/duplicate`,
  delete: (slug: string) => `/api/v1/legal/documents/${slug}`,
  publicDocuments: '/api/v1/legal/public/documents',
  publicDocument: (slug: string) => `/api/v1/legal/public/documents/${slug}`,
  acceptanceStatus: '/api/v1/legal/acceptance/status',
  acceptance: '/api/v1/legal/acceptance',
} as const;

export const SUPPLIERS_API = {
  suppliers: '/api/v1/suppliers',
  supplier: (id: string) => `/api/v1/suppliers/${id}`,
  providerTypes: '/api/v1/suppliers/provider-types',
  credentials: (id: string) => `/api/v1/suppliers/${id}/credentials`,
  settings: (id: string) => `/api/v1/suppliers/${id}/settings`,
  priority: (id: string) => `/api/v1/suppliers/${id}/priority`,
  enable: (id: string) => `/api/v1/suppliers/${id}/enable`,
  disable: (id: string) => `/api/v1/suppliers/${id}/disable`,
  testConnection: (id: string) => `/api/v1/suppliers/${id}/test-connection`,
  mappings: (supplierId: string) => `/api/v1/suppliers/${supplierId}/mappings`,
  mapping: (supplierId: string, mappingId: string) => `/api/v1/suppliers/${supplierId}/mappings/${mappingId}`,
} as const;

export const COMMUNICATION_API = {
  dashboardStats: '/api/v1/communication/dashboard/stats',
  templates: '/api/v1/communication/templates',
  template: (id: string) => `/api/v1/communication/templates/${id}`,
  publishTemplate: (id: string) => `/api/v1/communication/templates/${id}/publish`,
  previewTemplate: (id: string) => `/api/v1/communication/templates/${id}/preview`,
  messages: '/api/v1/communication/messages',
  message: (id: string) => `/api/v1/communication/messages/${id}`,
  failedDeliveries: '/api/v1/communication/failed-deliveries',
  retryDelivery: (id: string) => `/api/v1/communication/failed-deliveries/${id}/retry`,
  providers: '/api/v1/communication/providers',
  provider: (id: string) => `/api/v1/communication/providers/${id}`,
  auditLog: '/api/v1/communication/audit-log',
  preferences: '/api/v1/communication/preferences',
} as const;

export const SUPPORT_API = {
  // Customer-facing (RequireCustomerContext)
  tickets: '/api/v1/support/tickets',
  ticket: (id: string) => `/api/v1/support/tickets/${id}`,
  ticketMessages: (id: string) => `/api/v1/support/tickets/${id}/messages`,
  ticketClose: (id: string) => `/api/v1/support/tickets/${id}/close`,
  ticketReopen: (id: string) => `/api/v1/support/tickets/${id}/reopen`,
  ticketRate: (id: string) => `/api/v1/support/tickets/${id}/rate`,
  ticketAttachments: (id: string) => `/api/v1/support/tickets/${id}/attachments`,

  // Agent/admin-facing (permission-gated)
  adminTickets: '/api/v1/support/admin/tickets',
  adminTicket: (id: string) => `/api/v1/support/admin/tickets/${id}`,
  adminTicketMessages: (id: string) => `/api/v1/support/admin/tickets/${id}/messages`,
  adminTicketAssign: (id: string) => `/api/v1/support/admin/tickets/${id}/assign`,
  adminTicketStatus: (id: string) => `/api/v1/support/admin/tickets/${id}/status`,
  adminTicketPriority: (id: string) => `/api/v1/support/admin/tickets/${id}/priority`,
  adminTicketClose: (id: string) => `/api/v1/support/admin/tickets/${id}/close`,
  adminTicketReopen: (id: string) => `/api/v1/support/admin/tickets/${id}/reopen`,
  adminTicketMerge: (id: string) => `/api/v1/support/admin/tickets/${id}/merge`,
  adminTicketAttachments: (id: string) => `/api/v1/support/admin/tickets/${id}/attachments`,
  adminTicketTag: (id: string, tagId: string) => `/api/v1/support/admin/tickets/${id}/tags/${tagId}`,

  // Lookups (any authenticated user)
  categories: '/api/v1/support/categories',
  priorities: '/api/v1/support/priorities',
  tags: '/api/v1/support/tags',

  // Lookup admin CRUD (Support.ManageCategories)
  adminCategories: '/api/v1/support/admin/categories',
  adminCategory: (id: string) => `/api/v1/support/admin/categories/${id}`,
  adminPriorities: '/api/v1/support/admin/priorities',
  adminPriority: (id: string) => `/api/v1/support/admin/priorities/${id}`,
  adminTags: '/api/v1/support/admin/tags',
  adminTag: (id: string) => `/api/v1/support/admin/tags/${id}`,

  // Knowledge base — public (storefront) + admin authoring
  kbCategories: '/api/v1/knowledge-base/categories',
  kbArticles: '/api/v1/knowledge-base/articles',
  kbArticle: (id: string) => `/api/v1/knowledge-base/articles/${id}`,
  adminKbArticles: '/api/v1/support/admin/knowledge-base/articles',
  adminKbArticle: (id: string) => `/api/v1/support/admin/knowledge-base/articles/${id}`,
  adminKbArticlePublish: (id: string) => `/api/v1/support/admin/knowledge-base/articles/${id}/publish`,
  adminKbArticleUnpublish: (id: string) => `/api/v1/support/admin/knowledge-base/articles/${id}/unpublish`,
  adminKbCategories: '/api/v1/support/admin/knowledge-base/categories',
  adminKbCategory: (id: string) => `/api/v1/support/admin/knowledge-base/categories/${id}`,

  // Saved replies — agent search/render + admin authoring
  savedReplies: '/api/v1/support/saved-replies',
  savedReplyFolders: '/api/v1/support/saved-replies/folders',
  savedReplyRender: (id: string, ticketId: string) =>
    `/api/v1/support/saved-replies/${id}/render?ticketId=${ticketId}`,
  adminSavedReplies: '/api/v1/support/admin/saved-replies',
  adminSavedReply: (id: string) => `/api/v1/support/admin/saved-replies/${id}`,
  adminSavedReplyFolders: '/api/v1/support/admin/saved-replies/folders',
  adminSavedReplyFolder: (id: string) => `/api/v1/support/admin/saved-replies/folders/${id}`,

  // Analytics
  analytics: '/api/v1/support/admin/analytics',

  // SignalR hub (not an HTTP endpoint — base path for the hub connection)
  hub: '/hubs/support',
} as const;

export const SECURITY_API = {
  dashboard: '/api/v1/security/dashboard',
  events: '/api/v1/security/events',
  users: '/api/v1/security/users',
  blockUser: (userId: string) => `/api/v1/security/users/${userId}/block`,
  suspendUser: (userId: string) => `/api/v1/security/users/${userId}/suspend`,
  banUser: (userId: string) => `/api/v1/security/users/${userId}/ban`,
  unblockUser: (userId: string) => `/api/v1/security/users/${userId}/unblock`,
  emails: '/api/v1/security/emails',
  email: (id: string) => `/api/v1/security/emails/${id}`,
  ips: '/api/v1/security/ips',
  ip: (id: string) => `/api/v1/security/ips/${id}`,
  countries: '/api/v1/security/countries',
  country: (countryCode: string) => `/api/v1/security/countries/${countryCode}`,
} as const;

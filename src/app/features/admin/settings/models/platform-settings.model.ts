export interface PlatformSettingsCategoryDto {
  key: string;
  label: string;
  group: string;
  payload: Record<string, unknown>;
  modifiedOnUtc?: string | null;
  hasPersistedOverride: boolean;
}

export interface PlatformSettingsAuditEntryDto {
  id: string;
  categoryKey: string;
  action: string;
  actorDisplayName?: string | null;
  details?: string | null;
  occurredOnUtc: string;
}

export type SettingsFieldType = 'text' | 'textarea' | 'number' | 'checkbox' | 'color' | 'email';

export interface SettingsFieldConfig {
  key: string;
  label: string;
  type: SettingsFieldType;
  hint?: string;
  min?: number;
  max?: number;
}

export const SETTINGS_FIELD_CONFIGS: Record<string, SettingsFieldConfig[]> = {
  general: [
    { key: 'storeName', label: 'Store Name', type: 'text' },
    { key: 'storeDescription', label: 'Store Description', type: 'textarea' },
    { key: 'contactEmail', label: 'Contact Email', type: 'email' },
    { key: 'supportEmail', label: 'Support Email', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'address', label: 'Address', type: 'textarea' },
    { key: 'timezone', label: 'Timezone', type: 'text' },
    { key: 'defaultLanguage', label: 'Default Language', type: 'text' },
    { key: 'defaultCurrency', label: 'Default Currency', type: 'text' },
    { key: 'storeStatus', label: 'Store Status', type: 'text' },
  ],
  branding: [
    { key: 'logoUrl', label: 'Logo URL', type: 'text' },
    { key: 'faviconUrl', label: 'Favicon URL', type: 'text' },
    { key: 'adminLogoUrl', label: 'Admin Logo URL', type: 'text' },
    { key: 'primaryColor', label: 'Primary Color', type: 'color' },
    { key: 'secondaryColor', label: 'Secondary Color', type: 'color' },
    { key: 'accentColor', label: 'Accent Color', type: 'color' },
    { key: 'footerLogoUrl', label: 'Footer Logo URL', type: 'text' },
    { key: 'browserTitle', label: 'Browser Title', type: 'text' },
  ],
  email: [
    { key: 'enabled', label: 'SMTP Enabled', type: 'checkbox' },
    { key: 'smtpHost', label: 'SMTP Host', type: 'text' },
    { key: 'smtpPort', label: 'SMTP Port', type: 'number', min: 1, max: 65535 },
    { key: 'username', label: 'Username', type: 'text' },
    { key: 'password', label: 'Password', type: 'text', hint: 'Leave blank to keep stored password' },
    { key: 'useSsl', label: 'Use SSL/TLS', type: 'checkbox' },
    { key: 'senderName', label: 'Sender Name', type: 'text' },
    { key: 'senderEmail', label: 'Sender Email', type: 'email' },
    { key: 'applicationBaseUrl', label: 'Application Base URL', type: 'text' },
    { key: 'verificationPath', label: 'Verification Path', type: 'text' },
    { key: 'resetPasswordPath', label: 'Reset Password Path', type: 'text' },
  ],
  authentication: [
    { key: 'minimumPasswordLength', label: 'Minimum Password Length', type: 'number', min: 6, max: 128 },
    { key: 'requireNumbers', label: 'Require Numbers', type: 'checkbox' },
    { key: 'requireSymbols', label: 'Require Symbols', type: 'checkbox' },
    { key: 'requireUppercase', label: 'Require Uppercase', type: 'checkbox' },
    { key: 'sessionTimeoutMinutes', label: 'Session Timeout (minutes)', type: 'number', min: 5, max: 1440 },
    { key: 'rememberMeDurationDays', label: 'Remember Me Duration (days)', type: 'number', min: 1, max: 365 },
    { key: 'adminOtpEnabled', label: 'Admin OTP Enabled', type: 'checkbox' },
  ],
  security: [
    { key: 'maxFailedAccessAttempts', label: 'Max Failed Access Attempts', type: 'number', min: 1, max: 20 },
    { key: 'lockoutDurationMinutes', label: 'Lockout Duration (minutes)', type: 'number', min: 1, max: 1440 },
    { key: 'requireEmailVerification', label: 'Require Email Verification', type: 'checkbox' },
    { key: 'enforceHttps', label: 'Enforce HTTPS', type: 'checkbox' },
  ],
  otp: [
    { key: 'codeLength', label: 'Code Length', type: 'number', min: 4, max: 8 },
    { key: 'expirationMinutes', label: 'Expiration (minutes)', type: 'number', min: 1, max: 60 },
    { key: 'maxAttempts', label: 'Max Attempts', type: 'number', min: 1, max: 10 },
    { key: 'resendCooldownSeconds', label: 'Resend Cooldown (seconds)', type: 'number', min: 10, max: 600 },
    { key: 'lockoutMinutes', label: 'Lockout (minutes)', type: 'number', min: 1, max: 1440 },
  ],
  totp: [
    { key: 'enabled', label: 'TOTP Enabled', type: 'checkbox' },
    { key: 'architectureReady', label: 'Architecture Ready', type: 'checkbox' },
    { key: 'issuer', label: 'Issuer', type: 'text' },
    { key: 'digits', label: 'Digits', type: 'number', min: 6, max: 8 },
    { key: 'periodSeconds', label: 'Period (seconds)', type: 'number', min: 15, max: 120 },
  ],
  commerce: [
    { key: 'taxRatePercent', label: 'Tax Rate (%)', type: 'number', min: 0, max: 100 },
    { key: 'shippingEnabledFuture', label: 'Shipping (future)', type: 'checkbox' },
    { key: 'reservationTimeoutMinutes', label: 'Reservation Timeout (minutes)', type: 'number', min: 1, max: 120 },
    { key: 'orderExpirationHours', label: 'Order Expiration (hours)', type: 'number', min: 1, max: 168 },
    { key: 'refundWindowDays', label: 'Refund Window (days)', type: 'number', min: 0, max: 90 },
    { key: 'invoicePrefix', label: 'Invoice Prefix', type: 'text' },
  ],
  inventory: [
    { key: 'lowStockThreshold', label: 'Low Stock Threshold', type: 'number', min: 0, max: 1000 },
    { key: 'reservationTimeoutMinutes', label: 'Reservation Timeout (minutes)', type: 'number', min: 1, max: 120 },
    { key: 'automaticReleaseEnabled', label: 'Automatic Release', type: 'checkbox' },
    { key: 'codeRevealPolicy', label: 'Code Reveal Policy', type: 'text' },
  ],
  media: [
    { key: 'maxUploadSizeBytes', label: 'Max Upload Size (bytes)', type: 'number', min: 1024 },
    { key: 'imageCompressionEnabled', label: 'Image Compression', type: 'checkbox' },
    { key: 'thumbnailSmallPx', label: 'Thumbnail Small (px)', type: 'number', min: 32, max: 512 },
    { key: 'thumbnailMediumPx', label: 'Thumbnail Medium (px)', type: 'number', min: 64, max: 1024 },
    { key: 'thumbnailLargePx', label: 'Thumbnail Large (px)', type: 'number', min: 128, max: 2048 },
  ],
  seo: [
    { key: 'metaTitle', label: 'Meta Title', type: 'text' },
    { key: 'metaDescription', label: 'Meta Description', type: 'textarea' },
    { key: 'openGraphImageUrl', label: 'OpenGraph Image URL', type: 'text' },
    { key: 'twitterCardType', label: 'Twitter Card Type', type: 'text' },
    { key: 'robotsDirective', label: 'Robots Directive', type: 'text' },
    { key: 'canonicalBaseUrl', label: 'Canonical Base URL', type: 'text' },
  ],
  analytics: [
    { key: 'googleAnalyticsId', label: 'Google Analytics ID', type: 'text' },
    { key: 'googleTagManagerId', label: 'Google Tag Manager ID', type: 'text' },
    { key: 'metaPixelId', label: 'Meta Pixel ID', type: 'text' },
    { key: 'enableTracking', label: 'Enable Tracking', type: 'checkbox' },
  ],
  maintenance: [
    { key: 'enabled', label: 'Maintenance Mode', type: 'checkbox' },
    { key: 'message', label: 'Maintenance Message', type: 'textarea' },
    {
      key: 'bypassPassword',
      label: 'Bypass Password',
      type: 'text',
      hint: 'Owner-only password to unlock the Coming Soon page. Leave blank to keep the stored password.',
    },
  ],
  localization: [
    { key: 'defaultLanguage', label: 'Default Language', type: 'text' },
    { key: 'rtlEnabled', label: 'RTL Enabled', type: 'checkbox' },
  ],
  currency: [
    { key: 'baseCurrency', label: 'Base Currency', type: 'text' },
    { key: 'exchangeRateRefreshMinutes', label: 'Exchange Rate Refresh (minutes)', type: 'number', min: 5 },
    { key: 'provider', label: 'Provider', type: 'text' },
    { key: 'externalApiUrl', label: 'External API URL', type: 'text' },
  ],
  theme: [
    { key: 'defaultThemeId', label: 'Default Theme ID', type: 'text' },
    { key: 'allowCustomerThemeSwitch', label: 'Allow Customer Theme Switch', type: 'checkbox' },
    { key: 'syncWithSystemPreference', label: 'Sync With System Preference', type: 'checkbox' },
  ],
  checkout: [
    { key: 'guestCheckoutAllowed', label: 'Guest Checkout Allowed', type: 'checkbox' },
    { key: 'requirePhoneNumber', label: 'Require Phone Number', type: 'checkbox' },
    { key: 'defaultPaymentMethod', label: 'Default Payment Method', type: 'text' },
    { key: 'cartAbandonmentMinutes', label: 'Cart Abandonment (minutes)', type: 'number', min: 5 },
  ],
  promotions: [
    { key: 'defaultMaxDiscountPercent', label: 'Default Max Discount (%)', type: 'number', min: 0, max: 100 },
    { key: 'stackCouponsAllowed', label: 'Stack Coupons Allowed', type: 'checkbox' },
    { key: 'defaultCouponUsageLimit', label: 'Default Coupon Usage Limit', type: 'number', min: 1 },
    { key: 'defaultPerUserLimit', label: 'Default Per-User Limit', type: 'number', min: 1 },
  ],
  memberships: [
    { key: 'enabled', label: 'Memberships Enabled', type: 'checkbox' },
    { key: 'defaultTrialDays', label: 'Default Trial Days', type: 'number', min: 0 },
    { key: 'autoRenewDefault', label: 'Auto-Renew Default', type: 'checkbox' },
  ],
  referral: [
    { key: 'enabled', label: 'Referral Enabled', type: 'checkbox' },
    { key: 'referrerRewardPercent', label: 'Referrer Reward (%)', type: 'number', min: 0 },
    { key: 'refereeDiscountPercent', label: 'Referee Discount (%)', type: 'number', min: 0 },
    { key: 'rewardExpiryDays', label: 'Reward Expiry (days)', type: 'number', min: 1 },
  ],
  queue: [
    { key: 'workerIntervalSeconds', label: 'Worker Interval (seconds)', type: 'number', min: 5 },
    { key: 'batchSize', label: 'Batch Size', type: 'number', min: 1 },
    { key: 'maxConcurrency', label: 'Max Concurrency', type: 'number', min: 1 },
    { key: 'visibilityTimeoutSeconds', label: 'Visibility Timeout (seconds)', type: 'number', min: 30 },
  ],
  retryPolicies: [
    { key: 'retryCount', label: 'Retry Count', type: 'number', min: 0, max: 10 },
    { key: 'retryDelaySeconds', label: 'Retry Delay (seconds)', type: 'number', min: 1 },
    { key: 'timeoutSeconds', label: 'Timeout (seconds)', type: 'number', min: 10 },
    { key: 'deadLetterThreshold', label: 'Dead Letter Threshold', type: 'number', min: 1 },
  ],
  notifications: [
    { key: 'emailEnabled', label: 'Email Notifications', type: 'checkbox' },
    { key: 'smsEnabledFuture', label: 'SMS (future)', type: 'checkbox' },
    { key: 'pushEnabledFuture', label: 'Push (future)', type: 'checkbox' },
    { key: 'adminAlertsEnabled', label: 'Admin Alerts', type: 'checkbox' },
    { key: 'lowStockAlertsEnabled', label: 'Low Stock Alerts', type: 'checkbox' },
    { key: 'workerAlertsEnabled', label: 'Worker Alerts', type: 'checkbox' },
  ],
  integrations: [
    { key: 'stripePublishableKey', label: 'Stripe Publishable Key', type: 'text' },
    { key: 'paypalClientId', label: 'PayPal Client ID', type: 'text' },
    { key: 'webhooksEnabled', label: 'Webhooks Enabled', type: 'checkbox' },
  ],
  legal: [
    { key: 'termsHtml', label: 'Terms', type: 'textarea' },
    { key: 'privacyHtml', label: 'Privacy', type: 'textarea' },
    { key: 'refundPolicyHtml', label: 'Refund Policy', type: 'textarea' },
    { key: 'supportPolicyHtml', label: 'Support Policy', type: 'textarea' },
  ],
};

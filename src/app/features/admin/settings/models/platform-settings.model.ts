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

export type SettingsFieldControl =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'url'
  | 'color'
  | 'toggle'
  | 'select'
  | 'radio'
  | 'multiselect'
  | 'slider'
  | 'stepper'
  | 'autocomplete';

export interface SettingsFieldOption {
  label: string;
  value: string;
}

/** Fixed list, or a marker resolved to a live list by the page (roles/themes come from other admin facades; timezones from the platform's Intl data). */
export type SettingsFieldOptions = SettingsFieldOption[] | 'roles' | 'themes' | 'timezones';

export interface SettingsFieldValidators {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  format?: 'email' | 'url' | 'hex';
}

export interface SettingsFieldConfig {
  key: string;
  control: SettingsFieldControl;
  labelKey: string;
  helperKey?: string;
  tooltipKey?: string;
  exampleKey?: string;
  /** Sub-section within the category card. Fields sharing a group render together under one heading. */
  group?: string;
  /** Renders the field's group collapsed by default (progressive disclosure for technical fields). */
  advanced?: boolean;
  /** Requires confirmation before the change is applied. */
  dangerous?: boolean;
  options?: SettingsFieldOptions;
  validators?: SettingsFieldValidators;
  min?: number;
  max?: number;
  step?: number;
  /** Display unit shown next to slider/stepper values, e.g. 'minutes', '%'. */
  unit?: string;
  /** When set, the control displays value/scale (e.g. bytes -> MB) but the stored value stays unscaled. */
  scale?: number;
  rows?: number;
}

export function fieldKeys(path: string): { labelKey: string; helperKey: string; tooltipKey: string } {
  const base = `ADMIN.SETTINGS.FIELDS.${path}`;
  return { labelKey: `${base}.LABEL`, helperKey: `${base}.HELP`, tooltipKey: `${base}.TOOLTIP` };
}

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_PATTERN = /^https?:\/\/[^\s]+$/i;

/** Runs the field's declared validators against a value. Returns an i18n error code (resolved by the caller), or null when valid. No server-side validators exist for these payloads — this is a new client-side guardrail layer, not a mirror of pre-existing backend rules. */
export function validateFieldValue(field: SettingsFieldConfig, value: unknown): string | null {
  const v = field.validators;
  if (!v) {
    return null;
  }

  const isEmpty = value === null || value === undefined || value === '';

  if (v.required && isEmpty) {
    return 'REQUIRED';
  }
  if (isEmpty) {
    return null;
  }

  if (typeof value === 'string') {
    if (v.minLength !== undefined && value.length < v.minLength) {
      return 'MIN_LENGTH';
    }
    if (v.maxLength !== undefined && value.length > v.maxLength) {
      return 'MAX_LENGTH';
    }
    if (v.format === 'email' && !EMAIL_PATTERN.test(value)) {
      return 'INVALID_EMAIL';
    }
    if (v.format === 'url' && !URL_PATTERN.test(value)) {
      return 'INVALID_URL';
    }
    if (v.format === 'hex' && !HEX_PATTERN.test(value)) {
      return 'INVALID_HEX';
    }
  }

  if (typeof value === 'number') {
    if (v.min !== undefined && value < v.min) {
      return 'MIN_VALUE';
    }
    if (v.max !== undefined && value > v.max) {
      return 'MAX_VALUE';
    }
  }

  return null;
}

// ---- Curated option sets -------------------------------------------------
// Where the backend enforces a set (confirmed by reading the consumer), the options match it exactly
// (e.g. CURRENCY_PROVIDER_OPTIONS). Where a string field has no backend enforcement at all (confirmed —
// no FluentValidation, no branching consumer), the options are a curated, sensible set anchored on the
// real default value from PlatformSettingsDefaultsFactory.cs, replacing an unconstrained free-text input
// with a constrained one for UX purposes.

// Option `label`s are i18n keys under ADMIN.SETTINGS.OPTIONS.* — SettingsFieldComponent resolves them
// (reactively, re-running on language switch) before handing the list to PrimeNG's select/multiselect/
// radio controls, none of which translate `optionLabel` themselves.
const OPT = (path: string) => `ADMIN.SETTINGS.OPTIONS.${path}`;

export const LANGUAGE_OPTIONS: SettingsFieldOption[] = [
  { label: OPT('LANGUAGE.EN'), value: 'en' },
  { label: OPT('LANGUAGE.AR'), value: 'ar' },
];

export const CURRENCY_OPTIONS: SettingsFieldOption[] = [
  { label: OPT('CURRENCY.USD'), value: 'USD' },
  { label: OPT('CURRENCY.EUR'), value: 'EUR' },
  { label: OPT('CURRENCY.EGP'), value: 'EGP' },
  { label: OPT('CURRENCY.SAR'), value: 'SAR' },
];

export const STORE_STATUS_OPTIONS: SettingsFieldOption[] = [
  { label: OPT('STORE_STATUS.OPEN'), value: 'Open' },
  { label: OPT('STORE_STATUS.COMING_SOON'), value: 'ComingSoon' },
  { label: OPT('STORE_STATUS.CLOSED'), value: 'Closed' },
];

/** Matches CurrencyServiceCollectionExtensions.cs:25 exactly — "Http" (case-insensitive) selects the live provider, anything else falls back to configured static rates. */
export const CURRENCY_PROVIDER_OPTIONS: SettingsFieldOption[] = [
  { label: OPT('CURRENCY_PROVIDER.CONFIGURATION'), value: 'Configuration' },
  { label: OPT('CURRENCY_PROVIDER.HTTP'), value: 'Http' },
];

export const CODE_REVEAL_POLICY_OPTIONS: SettingsFieldOption[] = [
  { label: OPT('CODE_REVEAL_POLICY.AFTER_PAYMENT'), value: 'AfterPayment' },
  { label: OPT('CODE_REVEAL_POLICY.ON_FULFILLMENT'), value: 'OnFulfillment' },
  { label: OPT('CODE_REVEAL_POLICY.MANUAL'), value: 'Manual' },
];

export const FLASH_DEALS_SORT_OPTIONS: SettingsFieldOption[] = [
  { label: OPT('FLASH_DEALS_SORT.PRICE_DESC'), value: 'PriceDesc' },
  { label: OPT('FLASH_DEALS_SORT.PRICE_ASC'), value: 'PriceAsc' },
  { label: OPT('FLASH_DEALS_SORT.NEWEST'), value: 'Newest' },
  { label: OPT('FLASH_DEALS_SORT.ENDING_SOON'), value: 'EndingSoon' },
];

export const DISPLAY_STYLE_OPTIONS: SettingsFieldOption[] = [
  { label: OPT('DISPLAY_STYLE.GRID'), value: 'grid' },
  { label: OPT('DISPLAY_STYLE.CAROUSEL'), value: 'carousel' },
];

export const CATEGORY_SORT_OPTIONS: SettingsFieldOption[] = [
  { label: OPT('CATEGORY_SORT.NAME_ASC'), value: 'NameAsc' },
  { label: OPT('CATEGORY_SORT.NAME_DESC'), value: 'NameDesc' },
  { label: OPT('CATEGORY_SORT.MOST_POPULAR'), value: 'MostPopular' },
];

export const ANNOUNCEMENT_POSITION_OPTIONS: SettingsFieldOption[] = [
  { label: OPT('ANNOUNCEMENT_POSITION.TOP'), value: 'top' },
  { label: OPT('ANNOUNCEMENT_POSITION.BOTTOM'), value: 'bottom' },
];

export const TWITTER_CARD_OPTIONS: SettingsFieldOption[] = [
  { label: OPT('TWITTER_CARD.SUMMARY'), value: 'summary' },
  { label: OPT('TWITTER_CARD.SUMMARY_LARGE_IMAGE'), value: 'summary_large_image' },
];

export const ROBOTS_DIRECTIVE_OPTIONS: SettingsFieldOption[] = [
  { label: OPT('ROBOTS_DIRECTIVE.INDEX_FOLLOW'), value: 'index,follow' },
  { label: OPT('ROBOTS_DIRECTIVE.NOINDEX_FOLLOW'), value: 'noindex,follow' },
  { label: OPT('ROBOTS_DIRECTIVE.INDEX_NOFOLLOW'), value: 'index,nofollow' },
  { label: OPT('ROBOTS_DIRECTIVE.NOINDEX_NOFOLLOW'), value: 'noindex,nofollow' },
];

/** "Development" is deliberately excluded — it's a dev-only bypass provider (CLAUDE.md: production must never depend on it) and shouldn't be selectable from the admin UI. */
export const PAYMENT_METHOD_OPTIONS: SettingsFieldOption[] = [
  { label: OPT('PAYMENT_METHOD.CARD'), value: 'Card' },
];

export const ALLOWED_CONTENT_TYPE_OPTIONS: SettingsFieldOption[] = [
  { label: OPT('CONTENT_TYPE.JPEG'), value: 'image/jpeg' },
  { label: OPT('CONTENT_TYPE.PNG'), value: 'image/png' },
  { label: OPT('CONTENT_TYPE.WEBP'), value: 'image/webp' },
  { label: OPT('CONTENT_TYPE.GIF'), value: 'image/gif' },
  { label: OPT('CONTENT_TYPE.SVG'), value: 'image/svg+xml' },
  { label: OPT('CONTENT_TYPE.PDF'), value: 'application/pdf' },
];

export const SETTINGS_FIELD_CONFIGS: Record<string, SettingsFieldConfig[]> = {
  general: [
    { key: 'storeName', control: 'text', validators: { required: true }, ...fieldKeys('GENERAL.STORE_NAME') },
    { key: 'storeDescription', control: 'textarea', rows: 3, ...fieldKeys('GENERAL.STORE_DESCRIPTION') },
    {
      key: 'contactEmail',
      control: 'email',
      validators: { required: true, format: 'email' },
      ...fieldKeys('GENERAL.CONTACT_EMAIL'),
    },
    {
      key: 'supportEmail',
      control: 'email',
      validators: { required: true, format: 'email' },
      ...fieldKeys('GENERAL.SUPPORT_EMAIL'),
    },
    { key: 'phone', control: 'text', ...fieldKeys('GENERAL.PHONE') },
    { key: 'address', control: 'textarea', rows: 2, ...fieldKeys('GENERAL.ADDRESS') },
    { key: 'timezone', control: 'autocomplete', options: 'timezones', ...fieldKeys('GENERAL.TIMEZONE') },
    {
      key: 'defaultLanguage',
      control: 'select',
      options: LANGUAGE_OPTIONS,
      ...fieldKeys('GENERAL.DEFAULT_LANGUAGE'),
    },
    {
      key: 'defaultCurrency',
      control: 'select',
      options: CURRENCY_OPTIONS,
      ...fieldKeys('GENERAL.DEFAULT_CURRENCY'),
    },
    { key: 'storeStatus', control: 'select', options: STORE_STATUS_OPTIONS, ...fieldKeys('GENERAL.STORE_STATUS') },
  ],
  branding: [
    { key: 'logoUrl', control: 'url', validators: { format: 'url' }, ...fieldKeys('BRANDING.LOGO_URL') },
    { key: 'faviconUrl', control: 'url', validators: { format: 'url' }, ...fieldKeys('BRANDING.FAVICON_URL') },
    {
      key: 'adminLogoUrl',
      control: 'url',
      validators: { format: 'url' },
      ...fieldKeys('BRANDING.ADMIN_LOGO_URL'),
    },
    { key: 'primaryColor', control: 'color', validators: { format: 'hex' }, ...fieldKeys('BRANDING.PRIMARY_COLOR') },
    {
      key: 'secondaryColor',
      control: 'color',
      validators: { format: 'hex' },
      ...fieldKeys('BRANDING.SECONDARY_COLOR'),
    },
    { key: 'accentColor', control: 'color', validators: { format: 'hex' }, ...fieldKeys('BRANDING.ACCENT_COLOR') },
    {
      key: 'footerLogoUrl',
      control: 'url',
      validators: { format: 'url' },
      ...fieldKeys('BRANDING.FOOTER_LOGO_URL'),
    },
    {
      key: 'browserTitle',
      control: 'text',
      validators: { required: true },
      ...fieldKeys('BRANDING.BROWSER_TITLE'),
    },
  ],
  localization: [
    {
      key: 'defaultLanguage',
      control: 'select',
      options: LANGUAGE_OPTIONS,
      ...fieldKeys('LOCALIZATION.DEFAULT_LANGUAGE'),
    },
    {
      key: 'supportedLanguages',
      control: 'multiselect',
      options: LANGUAGE_OPTIONS,
      ...fieldKeys('LOCALIZATION.SUPPORTED_LANGUAGES'),
    },
    { key: 'rtlEnabled', control: 'toggle', ...fieldKeys('LOCALIZATION.RTL_ENABLED') },
  ],
  currency: [
    { key: 'baseCurrency', control: 'select', options: CURRENCY_OPTIONS, ...fieldKeys('CURRENCY.BASE_CURRENCY') },
    {
      key: 'supportedCurrencies',
      control: 'multiselect',
      options: CURRENCY_OPTIONS,
      ...fieldKeys('CURRENCY.SUPPORTED_CURRENCIES'),
    },
    {
      key: 'exchangeRateRefreshMinutes',
      control: 'stepper',
      min: 5,
      unit: 'minutes',
      validators: { min: 5 },
      ...fieldKeys('CURRENCY.EXCHANGE_RATE_REFRESH_MINUTES'),
    },
    {
      key: 'provider',
      control: 'radio',
      options: CURRENCY_PROVIDER_OPTIONS,
      ...fieldKeys('CURRENCY.PROVIDER'),
    },
    {
      key: 'externalApiUrl',
      control: 'url',
      validators: { format: 'url' },
      advanced: true,
      group: 'ADVANCED',
      ...fieldKeys('CURRENCY.EXTERNAL_API_URL'),
    },
    // `staticRates` (Dictionary<string,decimal>) is rendered by a dedicated rate-table block in the
    // settings page template, not through the generic field renderer — a key/value map doesn't fit the
    // flat field-list shape the other 25 categories use.
  ],
  theme: [
    { key: 'defaultThemeId', control: 'select', options: 'themes', ...fieldKeys('THEME.DEFAULT_THEME_ID') },
    { key: 'allowCustomerThemeSwitch', control: 'toggle', ...fieldKeys('THEME.ALLOW_CUSTOMER_THEME_SWITCH') },
    { key: 'syncWithSystemPreference', control: 'toggle', ...fieldKeys('THEME.SYNC_WITH_SYSTEM_PREFERENCE') },
  ],
  email: [
    { key: 'enabled', control: 'toggle', ...fieldKeys('EMAIL.ENABLED') },
    { key: 'senderName', control: 'text', validators: { required: true }, ...fieldKeys('EMAIL.SENDER_NAME') },
    {
      key: 'senderEmail',
      control: 'email',
      validators: { required: true, format: 'email' },
      ...fieldKeys('EMAIL.SENDER_EMAIL'),
    },
    {
      key: 'smtpHost',
      control: 'text',
      group: 'ADVANCED',
      advanced: true,
      ...fieldKeys('EMAIL.SMTP_HOST'),
    },
    {
      key: 'smtpPort',
      control: 'stepper',
      min: 1,
      max: 65535,
      validators: { min: 1, max: 65535 },
      group: 'ADVANCED',
      advanced: true,
      ...fieldKeys('EMAIL.SMTP_PORT'),
    },
    { key: 'username', control: 'text', group: 'ADVANCED', advanced: true, ...fieldKeys('EMAIL.USERNAME') },
    {
      key: 'password',
      control: 'text',
      group: 'ADVANCED',
      advanced: true,
      ...fieldKeys('EMAIL.PASSWORD'),
    },
    { key: 'useSsl', control: 'toggle', group: 'ADVANCED', advanced: true, ...fieldKeys('EMAIL.USE_SSL') },
    {
      key: 'applicationBaseUrl',
      control: 'url',
      validators: { format: 'url' },
      group: 'ADVANCED',
      advanced: true,
      ...fieldKeys('EMAIL.APPLICATION_BASE_URL'),
    },
    {
      key: 'verificationPath',
      control: 'text',
      group: 'ADVANCED',
      advanced: true,
      ...fieldKeys('EMAIL.VERIFICATION_PATH'),
    },
    {
      key: 'resetPasswordPath',
      control: 'text',
      group: 'ADVANCED',
      advanced: true,
      ...fieldKeys('EMAIL.RESET_PASSWORD_PATH'),
    },
  ],
  authentication: [
    {
      key: 'minimumPasswordLength',
      control: 'slider',
      min: 6,
      max: 128,
      unit: 'characters',
      validators: { min: 6, max: 128 },
      ...fieldKeys('AUTHENTICATION.MINIMUM_PASSWORD_LENGTH'),
    },
    { key: 'requireNumbers', control: 'toggle', ...fieldKeys('AUTHENTICATION.REQUIRE_NUMBERS') },
    { key: 'requireSymbols', control: 'toggle', ...fieldKeys('AUTHENTICATION.REQUIRE_SYMBOLS') },
    { key: 'requireUppercase', control: 'toggle', ...fieldKeys('AUTHENTICATION.REQUIRE_UPPERCASE') },
    {
      key: 'sessionTimeoutMinutes',
      control: 'slider',
      min: 5,
      max: 1440,
      unit: 'minutes',
      validators: { min: 5, max: 1440 },
      ...fieldKeys('AUTHENTICATION.SESSION_TIMEOUT_MINUTES'),
    },
    {
      key: 'rememberMeDurationDays',
      control: 'stepper',
      min: 1,
      max: 365,
      unit: 'days',
      validators: { min: 1, max: 365 },
      ...fieldKeys('AUTHENTICATION.REMEMBER_ME_DURATION_DAYS'),
    },
    { key: 'adminOtpEnabled', control: 'toggle', ...fieldKeys('AUTHENTICATION.ADMIN_OTP_ENABLED') },
  ],
  security: [
    {
      key: 'maxFailedAccessAttempts',
      control: 'stepper',
      min: 1,
      max: 20,
      validators: { min: 1, max: 20 },
      ...fieldKeys('SECURITY.MAX_FAILED_ACCESS_ATTEMPTS'),
    },
    {
      key: 'lockoutDurationMinutes',
      control: 'slider',
      min: 1,
      max: 1440,
      unit: 'minutes',
      validators: { min: 1, max: 1440 },
      ...fieldKeys('SECURITY.LOCKOUT_DURATION_MINUTES'),
    },
    {
      key: 'requireEmailVerification',
      control: 'toggle',
      ...fieldKeys('SECURITY.REQUIRE_EMAIL_VERIFICATION'),
    },
    {
      key: 'enforceHttps',
      control: 'toggle',
      dangerous: true,
      ...fieldKeys('SECURITY.ENFORCE_HTTPS'),
    },
  ],
  otp: [
    {
      key: 'codeLength',
      control: 'stepper',
      min: 4,
      max: 8,
      validators: { min: 4, max: 8 },
      ...fieldKeys('OTP.CODE_LENGTH'),
    },
    {
      key: 'expirationMinutes',
      control: 'stepper',
      min: 1,
      max: 60,
      unit: 'minutes',
      validators: { min: 1, max: 60 },
      ...fieldKeys('OTP.EXPIRATION_MINUTES'),
    },
    {
      key: 'maxAttempts',
      control: 'stepper',
      min: 1,
      max: 10,
      validators: { min: 1, max: 10 },
      ...fieldKeys('OTP.MAX_ATTEMPTS'),
    },
    {
      key: 'resendCooldownSeconds',
      control: 'stepper',
      min: 10,
      max: 600,
      unit: 'seconds',
      validators: { min: 10, max: 600 },
      ...fieldKeys('OTP.RESEND_COOLDOWN_SECONDS'),
    },
    {
      key: 'lockoutMinutes',
      control: 'stepper',
      min: 1,
      max: 1440,
      unit: 'minutes',
      validators: { min: 1, max: 1440 },
      ...fieldKeys('OTP.LOCKOUT_MINUTES'),
    },
  ],
  totp: [
    { key: 'enabled', control: 'toggle', ...fieldKeys('TOTP.ENABLED') },
    { key: 'architectureReady', control: 'toggle', ...fieldKeys('TOTP.ARCHITECTURE_READY') },
    { key: 'issuer', control: 'text', ...fieldKeys('TOTP.ISSUER') },
    {
      key: 'digits',
      control: 'stepper',
      min: 6,
      max: 8,
      validators: { min: 6, max: 8 },
      ...fieldKeys('TOTP.DIGITS'),
    },
    {
      key: 'periodSeconds',
      control: 'stepper',
      min: 15,
      max: 120,
      unit: 'seconds',
      validators: { min: 15, max: 120 },
      ...fieldKeys('TOTP.PERIOD_SECONDS'),
    },
  ],
  commerce: [
    {
      key: 'taxRatePercent',
      control: 'slider',
      min: 0,
      max: 100,
      step: 0.5,
      unit: '%',
      validators: { min: 0, max: 100 },
      ...fieldKeys('COMMERCE.TAX_RATE_PERCENT'),
    },
    { key: 'shippingEnabledFuture', control: 'toggle', ...fieldKeys('COMMERCE.SHIPPING_ENABLED_FUTURE') },
    {
      key: 'reservationTimeoutMinutes',
      control: 'stepper',
      min: 1,
      max: 120,
      unit: 'minutes',
      validators: { min: 1, max: 120 },
      ...fieldKeys('COMMERCE.RESERVATION_TIMEOUT_MINUTES'),
    },
    {
      key: 'orderExpirationHours',
      control: 'stepper',
      min: 1,
      max: 168,
      unit: 'hours',
      validators: { min: 1, max: 168 },
      ...fieldKeys('COMMERCE.ORDER_EXPIRATION_HOURS'),
    },
    {
      key: 'refundWindowDays',
      control: 'stepper',
      min: 0,
      max: 90,
      unit: 'days',
      validators: { min: 0, max: 90 },
      ...fieldKeys('COMMERCE.REFUND_WINDOW_DAYS'),
    },
    { key: 'invoicePrefix', control: 'text', ...fieldKeys('COMMERCE.INVOICE_PREFIX') },
  ],
  checkout: [
    { key: 'guestCheckoutAllowed', control: 'toggle', ...fieldKeys('CHECKOUT.GUEST_CHECKOUT_ALLOWED') },
    { key: 'requirePhoneNumber', control: 'toggle', ...fieldKeys('CHECKOUT.REQUIRE_PHONE_NUMBER') },
    {
      key: 'defaultPaymentMethod',
      control: 'select',
      options: PAYMENT_METHOD_OPTIONS,
      ...fieldKeys('CHECKOUT.DEFAULT_PAYMENT_METHOD'),
    },
    {
      key: 'cartAbandonmentMinutes',
      control: 'stepper',
      min: 5,
      unit: 'minutes',
      validators: { min: 5 },
      ...fieldKeys('CHECKOUT.CART_ABANDONMENT_MINUTES'),
    },
  ],
  promotions: [
    {
      key: 'defaultMaxDiscountPercent',
      control: 'slider',
      min: 0,
      max: 100,
      unit: '%',
      validators: { min: 0, max: 100 },
      ...fieldKeys('PROMOTIONS.DEFAULT_MAX_DISCOUNT_PERCENT'),
    },
    { key: 'stackCouponsAllowed', control: 'toggle', ...fieldKeys('PROMOTIONS.STACK_COUPONS_ALLOWED') },
    {
      key: 'defaultCouponUsageLimit',
      control: 'stepper',
      min: 1,
      validators: { min: 1 },
      ...fieldKeys('PROMOTIONS.DEFAULT_COUPON_USAGE_LIMIT'),
    },
    {
      key: 'defaultPerUserLimit',
      control: 'stepper',
      min: 1,
      validators: { min: 1 },
      ...fieldKeys('PROMOTIONS.DEFAULT_PER_USER_LIMIT'),
    },
  ],
  memberships: [
    { key: 'enabled', control: 'toggle', ...fieldKeys('MEMBERSHIPS.ENABLED') },
    {
      key: 'defaultTrialDays',
      control: 'stepper',
      min: 0,
      unit: 'days',
      validators: { min: 0 },
      ...fieldKeys('MEMBERSHIPS.DEFAULT_TRIAL_DAYS'),
    },
    { key: 'autoRenewDefault', control: 'toggle', ...fieldKeys('MEMBERSHIPS.AUTO_RENEW_DEFAULT') },
  ],
  referral: [
    { key: 'enabled', control: 'toggle', ...fieldKeys('REFERRAL.ENABLED') },
    {
      key: 'referrerRewardPercent',
      control: 'slider',
      min: 0,
      max: 100,
      unit: '%',
      validators: { min: 0, max: 100 },
      ...fieldKeys('REFERRAL.REFERRER_REWARD_PERCENT'),
    },
    {
      key: 'refereeDiscountPercent',
      control: 'slider',
      min: 0,
      max: 100,
      unit: '%',
      validators: { min: 0, max: 100 },
      ...fieldKeys('REFERRAL.REFEREE_DISCOUNT_PERCENT'),
    },
    {
      key: 'rewardExpiryDays',
      control: 'stepper',
      min: 1,
      unit: 'days',
      validators: { min: 1 },
      ...fieldKeys('REFERRAL.REWARD_EXPIRY_DAYS'),
    },
  ],
  inventory: [
    {
      key: 'lowStockThreshold',
      control: 'stepper',
      min: 0,
      max: 1000,
      validators: { min: 0, max: 1000 },
      ...fieldKeys('INVENTORY.LOW_STOCK_THRESHOLD'),
    },
    {
      key: 'reservationTimeoutMinutes',
      control: 'stepper',
      min: 1,
      max: 120,
      unit: 'minutes',
      validators: { min: 1, max: 120 },
      ...fieldKeys('INVENTORY.RESERVATION_TIMEOUT_MINUTES'),
    },
    { key: 'automaticReleaseEnabled', control: 'toggle', ...fieldKeys('INVENTORY.AUTOMATIC_RELEASE_ENABLED') },
    {
      key: 'codeRevealPolicy',
      control: 'select',
      options: CODE_REVEAL_POLICY_OPTIONS,
      ...fieldKeys('INVENTORY.CODE_REVEAL_POLICY'),
    },
  ],
  queue: [
    {
      key: 'workerIntervalSeconds',
      control: 'stepper',
      min: 5,
      unit: 'seconds',
      validators: { min: 5 },
      ...fieldKeys('QUEUE.WORKER_INTERVAL_SECONDS'),
    },
    {
      key: 'batchSize',
      control: 'stepper',
      min: 1,
      validators: { min: 1 },
      ...fieldKeys('QUEUE.BATCH_SIZE'),
    },
    {
      key: 'maxConcurrency',
      control: 'stepper',
      min: 1,
      validators: { min: 1 },
      ...fieldKeys('QUEUE.MAX_CONCURRENCY'),
    },
    {
      key: 'visibilityTimeoutSeconds',
      control: 'stepper',
      min: 30,
      unit: 'seconds',
      validators: { min: 30 },
      ...fieldKeys('QUEUE.VISIBILITY_TIMEOUT_SECONDS'),
    },
  ],
  retryPolicies: [
    {
      key: 'retryCount',
      control: 'stepper',
      min: 0,
      max: 10,
      validators: { min: 0, max: 10 },
      ...fieldKeys('RETRY_POLICIES.RETRY_COUNT'),
    },
    {
      key: 'retryDelaySeconds',
      control: 'stepper',
      min: 1,
      unit: 'seconds',
      validators: { min: 1 },
      ...fieldKeys('RETRY_POLICIES.RETRY_DELAY_SECONDS'),
    },
    {
      key: 'timeoutSeconds',
      control: 'stepper',
      min: 10,
      unit: 'seconds',
      validators: { min: 10 },
      ...fieldKeys('RETRY_POLICIES.TIMEOUT_SECONDS'),
    },
    {
      key: 'deadLetterThreshold',
      control: 'stepper',
      min: 1,
      validators: { min: 1 },
      ...fieldKeys('RETRY_POLICIES.DEAD_LETTER_THRESHOLD'),
    },
    { key: 'useExponentialBackoff', control: 'toggle', ...fieldKeys('RETRY_POLICIES.USE_EXPONENTIAL_BACKOFF') },
  ],
  notifications: [
    { key: 'emailEnabled', control: 'toggle', ...fieldKeys('NOTIFICATIONS.EMAIL_ENABLED') },
    { key: 'smsEnabledFuture', control: 'toggle', ...fieldKeys('NOTIFICATIONS.SMS_ENABLED_FUTURE') },
    { key: 'pushEnabledFuture', control: 'toggle', ...fieldKeys('NOTIFICATIONS.PUSH_ENABLED_FUTURE') },
    { key: 'adminAlertsEnabled', control: 'toggle', ...fieldKeys('NOTIFICATIONS.ADMIN_ALERTS_ENABLED') },
    { key: 'lowStockAlertsEnabled', control: 'toggle', ...fieldKeys('NOTIFICATIONS.LOW_STOCK_ALERTS_ENABLED') },
    { key: 'workerAlertsEnabled', control: 'toggle', ...fieldKeys('NOTIFICATIONS.WORKER_ALERTS_ENABLED') },
  ],
  media: [
    {
      key: 'maxUploadSizeBytes',
      control: 'slider',
      min: 1,
      max: 50,
      unit: 'MB',
      scale: 1_048_576,
      validators: { min: 1024 },
      ...fieldKeys('MEDIA.MAX_UPLOAD_SIZE_BYTES'),
    },
    { key: 'imageCompressionEnabled', control: 'toggle', ...fieldKeys('MEDIA.IMAGE_COMPRESSION_ENABLED') },
    {
      key: 'allowedContentTypes',
      control: 'multiselect',
      options: ALLOWED_CONTENT_TYPE_OPTIONS,
      ...fieldKeys('MEDIA.ALLOWED_CONTENT_TYPES'),
    },
    {
      key: 'thumbnailSmallPx',
      control: 'stepper',
      min: 32,
      max: 512,
      unit: 'px',
      validators: { min: 32, max: 512 },
      group: 'ADVANCED',
      advanced: true,
      ...fieldKeys('MEDIA.THUMBNAIL_SMALL_PX'),
    },
    {
      key: 'thumbnailMediumPx',
      control: 'stepper',
      min: 64,
      max: 1024,
      unit: 'px',
      validators: { min: 64, max: 1024 },
      group: 'ADVANCED',
      advanced: true,
      ...fieldKeys('MEDIA.THUMBNAIL_MEDIUM_PX'),
    },
    {
      key: 'thumbnailLargePx',
      control: 'stepper',
      min: 128,
      max: 2048,
      unit: 'px',
      validators: { min: 128, max: 2048 },
      group: 'ADVANCED',
      advanced: true,
      ...fieldKeys('MEDIA.THUMBNAIL_LARGE_PX'),
    },
  ],
  seo: [
    { key: 'metaTitle', control: 'text', ...fieldKeys('SEO.META_TITLE') },
    { key: 'metaDescription', control: 'textarea', rows: 2, ...fieldKeys('SEO.META_DESCRIPTION') },
    {
      key: 'openGraphImageUrl',
      control: 'url',
      validators: { format: 'url' },
      ...fieldKeys('SEO.OPEN_GRAPH_IMAGE_URL'),
    },
    {
      key: 'twitterCardType',
      control: 'select',
      options: TWITTER_CARD_OPTIONS,
      ...fieldKeys('SEO.TWITTER_CARD_TYPE'),
    },
    {
      key: 'robotsDirective',
      control: 'select',
      options: ROBOTS_DIRECTIVE_OPTIONS,
      ...fieldKeys('SEO.ROBOTS_DIRECTIVE'),
    },
    {
      key: 'canonicalBaseUrl',
      control: 'url',
      validators: { required: true, format: 'url' },
      ...fieldKeys('SEO.CANONICAL_BASE_URL'),
    },
  ],
  analytics: [
    { key: 'googleAnalyticsId', control: 'text', ...fieldKeys('ANALYTICS.GOOGLE_ANALYTICS_ID') },
    { key: 'googleTagManagerId', control: 'text', ...fieldKeys('ANALYTICS.GOOGLE_TAG_MANAGER_ID') },
    { key: 'metaPixelId', control: 'text', ...fieldKeys('ANALYTICS.META_PIXEL_ID') },
    { key: 'enableTracking', control: 'toggle', ...fieldKeys('ANALYTICS.ENABLE_TRACKING') },
  ],
  integrations: [
    { key: 'stripePublishableKey', control: 'text', ...fieldKeys('INTEGRATIONS.STRIPE_PUBLISHABLE_KEY') },
    { key: 'paypalClientId', control: 'text', ...fieldKeys('INTEGRATIONS.PAYPAL_CLIENT_ID') },
    { key: 'webhooksEnabled', control: 'toggle', ...fieldKeys('INTEGRATIONS.WEBHOOKS_ENABLED') },
    // `stripeWebhookSecretConfigured` is a read-only status flag (mirrors the `hasStoredPassword` /
    // `hasStoredBypassPassword` pattern) — rendered as a status badge next to the Stripe fields in the
    // page template, not as an editable field here.
  ],
  maintenance: [
    { key: 'enabled', control: 'toggle', dangerous: true, ...fieldKeys('MAINTENANCE.ENABLED') },
    { key: 'message', control: 'textarea', rows: 3, ...fieldKeys('MAINTENANCE.MESSAGE') },
    {
      key: 'allowedRoleNames',
      control: 'multiselect',
      options: 'roles',
      ...fieldKeys('MAINTENANCE.ALLOWED_ROLE_NAMES'),
    },
    { key: 'bypassPassword', control: 'text', ...fieldKeys('MAINTENANCE.BYPASS_PASSWORD') },
  ],
  legal: [
    { key: 'termsHtml', control: 'textarea', rows: 8, ...fieldKeys('LEGAL.TERMS_HTML') },
    { key: 'privacyHtml', control: 'textarea', rows: 8, ...fieldKeys('LEGAL.PRIVACY_HTML') },
    { key: 'refundPolicyHtml', control: 'textarea', rows: 8, ...fieldKeys('LEGAL.REFUND_POLICY_HTML') },
    { key: 'supportPolicyHtml', control: 'textarea', rows: 8, ...fieldKeys('LEGAL.SUPPORT_POLICY_HTML') },
  ],
};

/** Categories that are purely technical/operational — collapsed into an "Advanced" nav section by default rather than sitting alongside everyday settings. */
export const ADVANCED_CATEGORY_KEYS: readonly string[] = ['queue', 'retryPolicies', 'otp', 'totp'];

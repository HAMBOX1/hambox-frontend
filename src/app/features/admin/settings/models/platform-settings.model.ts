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
  | 'autocomplete'
  | 'route'
  | 'media'
  | 'icon';

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
  /** 'media' control only: recommended dimensions/format shown under the field, e.g. "1920×800px". */
  recommendedSize?: string;
}

export function fieldKeys(path: string): { labelKey: string; helperKey: string; tooltipKey: string } {
  const base = `ADMIN.SETTINGS.FIELDS.${path}`;
  return { labelKey: `${base}.LABEL`, helperKey: `${base}.HELP`, tooltipKey: `${base}.TOOLTIP` };
}

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_PATTERN = /^https?:\/\/[^\s]+$/i;
/** A "route" field accepts either an app-relative path (`/products`) or a full external URL. */
const ROUTE_VALUE_PATTERN = /^(\/[^\s]*|https?:\/\/[^\s]+)$/i;

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
    if (field.control === 'route' && !ROUTE_VALUE_PATTERN.test(value)) {
      return 'INVALID_ROUTE';
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

export const TWITTER_CARD_OPTIONS: SettingsFieldOption[] = [
  { label: OPT('TWITTER_CARD.SUMMARY'), value: 'summary' },
  { label: OPT('TWITTER_CARD.SUMMARY_LARGE_IMAGE'), value: 'summary_large_image' },
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
    // storeDescription/contactEmail/supportEmail/phone/address/timezone/defaultLanguage/defaultCurrency
    // removed — no backend consumer; contact/address info is actually served from the wired
    // Storefront → Footer fields instead, and defaultLanguage/defaultCurrency duplicate the
    // (also unwired) localization/currency category fields without either being read anywhere.
    { key: 'storeStatus', control: 'select', options: STORE_STATUS_OPTIONS, ...fieldKeys('GENERAL.STORE_STATUS') },
  ],
  // `branding` category removed from the settings UI by request — see HIDDEN_CATEGORY_KEYS.
  // `localization` category removed entirely — the frontend hardcodes AVAILABLE_LANGUAGES
  // (core/i18n/locale.model.ts) and no backend consumer reads DefaultLanguage/SupportedLanguages/
  // RtlEnabled beyond a discarded health-check probe. See HIDDEN_CATEGORY_KEYS.
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
  // `theme` category removed entirely — defaultThemeId is superseded by the Themes module's own
  // IsDefault flag (set via the real theme editor, ThemeEngine.cs), and allowCustomerThemeSwitch
  // conflates the admin-curated store-theme concept with the unrelated light/dark ThemeService
  // toggle, which renders unconditionally everywhere already. See HIDDEN_CATEGORY_KEYS.
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
    // `enforceHttps` removed — no backend consumer, HTTPS enforcement isn't conditional on it.
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
  // `totp` category removed entirely — the payload round-trips to storage but nothing in the
  // login/auth flow reads it; authenticator-app TOTP isn't actually wired up (email OTP is the
  // real second factor, see `otp` below).
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
    {
      key: 'defaultSupplierMarginPercent',
      control: 'slider',
      min: 0,
      max: 200,
      step: 0.5,
      unit: '%',
      validators: { min: 0, max: 200 },
      ...fieldKeys('COMMERCE.DEFAULT_SUPPLIER_MARGIN_PERCENT'),
    },
  ],
  // `checkout` category removed entirely — guestCheckoutAllowed is directly contradicted by the
  // hardcoded authGuard on the storefront /checkout route (checkout always requires login);
  // requirePhoneNumber and cartAbandonmentMinutes have no backend consumer at all. See
  // HIDDEN_CATEGORY_KEYS.
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
  // `memberships` category removed entirely — no consumer reads Enabled/DefaultTrialDays/
  // AutoRenewDefault; the purchase flow (MembershipCheckoutCommandHandler) always sets
  // autoRenew explicitly per-subscription from the customer's own choice, never from a global
  // default, and no trial concept exists in that flow. See HIDDEN_CATEGORY_KEYS.
  referral: [
    { key: 'enabled', control: 'toggle', ...fieldKeys('REFERRAL.ENABLED') },
    {
      key: 'pointsPerReferral',
      control: 'stepper',
      min: 0,
      unit: 'points',
      validators: { min: 0 },
      ...fieldKeys('REFERRAL.POINTS_PER_REFERRAL'),
    },
    {
      key: 'pointValueUsd',
      control: 'number',
      min: 0,
      step: 0.01,
      unit: '$',
      validators: { min: 0 },
      ...fieldKeys('REFERRAL.POINT_VALUE_USD'),
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
    // `codeRevealPolicy` removed — reveal has no policy branching today (RevealCustomerLibraryKeyQuery
    // reveals whenever the key value is populated, which already behaves like AfterPayment for
    // manually-fulfilled orders and like OnFulfillment for supplier-fulfilled ones); implementing a
    // real "Manual" gate needs new admin-approval domain state, not a wiring fix.
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
    // maxConcurrency/visibilityTimeoutSeconds removed — OperationalJobWorker processes its claimed
    // batch sequentially (no bounded-parallelism mechanism) and OperationalJobQueue has no
    // lease/reclaim concept, so neither field has anything to gate.
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
    // smsEnabledFuture/pushEnabledFuture/adminAlertsEnabled/lowStockAlertsEnabled/workerAlertsEnabled
    // removed — none gate any actual alert-sending code path, only emailEnabled does.
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
    {
      key: 'allowedContentTypes',
      control: 'multiselect',
      options: ALLOWED_CONTENT_TYPE_OPTIONS,
      ...fieldKeys('MEDIA.ALLOWED_CONTENT_TYPES'),
    },
    // imageCompressionEnabled and thumbnailSmallPx/MediumPx/LargePx removed — no image
    // compression or thumbnail generation exists in the backend to read them.
  ],
  // `seo` category removed entirely — no Angular code reads publicSettings.seo to set meta tags,
  // <title>, or Open Graph/Twitter Card data; the fields round-trip to storage only.
  // `analytics` category removed entirely — no Angular code reads publicSettings.analytics to
  // inject a GA/GTM/Meta Pixel script; enableTracking is a no-op toggle today.
  // `integrations` category removed entirely — Stripe/PayPal/webhooks have no real backend
  // implementation; the fields round-trip to storage only.
  // See HIDDEN_CATEGORY_KEYS for all three.
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
  // `legal` category removed entirely — superseded by the dedicated Legal module
  // (/api/v1/legal/public/documents/{slug}), which is what the real Terms/Privacy/Refund pages
  // actually fetch. Editing this category's HTML strings has no effect on what customers see;
  // use the Legal module's own admin UI instead. See HIDDEN_CATEGORY_KEYS.
};

/** Categories that are purely technical/operational — collapsed into an "Advanced" nav section by default rather than sitting alongside everyday settings. */
export const ADVANCED_CATEGORY_KEYS: readonly string[] = ['queue', 'retryPolicies', 'otp'];

/** Categories the backend still returns (default payload rows exist) but that have no real
 * consumer anywhere — hidden from the settings nav so admins can't "configure" something inert. */
export const HIDDEN_CATEGORY_KEYS: readonly string[] = [
  'totp',
  'integrations',
  'branding',
  'localization',
  'theme',
  'checkout',
  'memberships',
  'seo',
  'analytics',
  'legal',
];

export type SupportedLanguageId = 'en' | 'ar';

export const DEFAULT_LANGUAGE_ID: SupportedLanguageId = 'en';
export const LANGUAGE_STORAGE_KEY = 'hambox.language';
export const LANGUAGE_COOKIE_NAME = 'hambox-culture';

export interface LanguageDefinition {
  readonly id: SupportedLanguageId;
  readonly labelKey: string;
  readonly nativeName: string;
  readonly flagEmoji: string;
  readonly direction: 'ltr' | 'rtl';
  readonly angularLocale: string;
}

export const AVAILABLE_LANGUAGES: readonly LanguageDefinition[] = [
  {
    id: 'en',
    labelKey: 'COMMON.LANGUAGES.EN',
    nativeName: 'English',
    flagEmoji: '🇺🇸',
    direction: 'ltr',
    angularLocale: 'en-US',
  },
  {
    id: 'ar',
    labelKey: 'COMMON.LANGUAGES.AR',
    nativeName: 'العربية',
    flagEmoji: '🇪🇬',
    direction: 'rtl',
    angularLocale: 'ar-EG',
  },
] as const;

export function isSupportedLanguageId(value: string | null | undefined): value is SupportedLanguageId {
  return value === 'en' || value === 'ar';
}

export function languageDefinition(id: SupportedLanguageId): LanguageDefinition {
  return AVAILABLE_LANGUAGES.find((lang) => lang.id === id) ?? AVAILABLE_LANGUAGES[0];
}

export type SupportedCurrencyCode = 'USD' | 'EUR' | 'EGP' | 'SAR';

export const DEFAULT_CURRENCY_CODE: SupportedCurrencyCode = 'USD';
export const BASE_CURRENCY_CODE: SupportedCurrencyCode = 'USD';
export const CURRENCY_STORAGE_KEY = 'hambox.currency';
export const EXCHANGE_RATES_CACHE_KEY = 'hambox.exchange-rates.cache';
export const EXCHANGE_RATES_REFRESH_MS = 60 * 60 * 1000;

export interface CurrencyDefinition {
  readonly code: SupportedCurrencyCode;
  readonly labelKey: string;
  readonly nativeName: string;
  readonly symbol: string;
  readonly flagEmoji: string;
}

export interface ExchangeRatesResponse {
  readonly baseCurrency: string;
  readonly rates: Readonly<Record<string, number>>;
  readonly updatedAtUtc: string;
}

export const AVAILABLE_CURRENCIES: readonly CurrencyDefinition[] = [
  {
    code: 'USD',
    labelKey: 'CURRENCY.USD',
    nativeName: 'US Dollar',
    symbol: '$',
    flagEmoji: '🇺🇸',
  },
  {
    code: 'EUR',
    labelKey: 'CURRENCY.EUR',
    nativeName: 'Euro',
    symbol: '€',
    flagEmoji: '🇪🇺',
  },
  {
    code: 'EGP',
    labelKey: 'CURRENCY.EGP',
    nativeName: 'Egyptian Pound',
    symbol: 'E£',
    flagEmoji: '🇪🇬',
  },
  {
    code: 'SAR',
    labelKey: 'CURRENCY.SAR',
    nativeName: 'Saudi Riyal',
    symbol: '﷼',
    flagEmoji: '🇸🇦',
  },
] as const;

export function isSupportedCurrencyCode(value: string | null | undefined): value is SupportedCurrencyCode {
  return value === 'USD' || value === 'EUR' || value === 'EGP' || value === 'SAR';
}

export function currencyDefinition(code: SupportedCurrencyCode): CurrencyDefinition {
  return AVAILABLE_CURRENCIES.find((currency) => currency.code === code) ?? AVAILABLE_CURRENCIES[0];
}

export const DEFAULT_EXCHANGE_RATES: Readonly<Record<SupportedCurrencyCode, number>> = {
  USD: 1,
  EUR: 0.92,
  EGP: 48.5,
  SAR: 3.75,
};

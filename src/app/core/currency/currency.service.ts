import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { LOCALIZATION_API } from '../api/api-endpoints';
import { ApiClientService } from '../api/api-client.service';
import { AuthSessionService } from '../auth/auth-session.service';
import { AUTH_API } from '../api/api-endpoints';
import { TranslationService } from '../i18n/translation.service';
import {
  AVAILABLE_CURRENCIES,
  BASE_CURRENCY_CODE,
  CURRENCY_STORAGE_KEY,
  CurrencyDefinition,
  DEFAULT_CURRENCY_CODE,
  DEFAULT_EXCHANGE_RATES,
  EXCHANGE_RATES_CACHE_KEY,
  EXCHANGE_RATES_REFRESH_MS,
  ExchangeRatesResponse,
  SupportedCurrencyCode,
  currencyDefinition,
  isSupportedCurrencyCode,
} from './currency.model';

interface CachedRates {
  readonly rates: Readonly<Record<string, number>>;
  readonly updatedAt: number;
}

interface UserLocaleProfile {
  readonly firstName: string;
  readonly lastName: string;
  readonly phoneNumber: string | null;
  readonly preferredLanguage: string;
  readonly preferredCurrency: string;
}

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly api = inject(ApiClientService);
  private readonly session = inject(AuthSessionService);
  private readonly translation = inject(TranslationService);

  private readonly currencyState = signal<SupportedCurrencyCode>(DEFAULT_CURRENCY_CODE);
  private readonly ratesState = signal<Readonly<Record<string, number>>>({ ...DEFAULT_EXCHANGE_RATES });
  private readonly readyState = signal(false);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  readonly currency = this.currencyState.asReadonly();
  readonly currencies: readonly CurrencyDefinition[] = AVAILABLE_CURRENCIES;
  readonly isReady = this.readyState.asReadonly();
  readonly currentCurrency = computed(() => currencyDefinition(this.currencyState()));
  readonly rates = this.ratesState.asReadonly();

  /** Bootstrap currency preference and exchange rates. */
  async init(): Promise<void> {
    const initial = this.resolveInitialCurrency();
    this.currencyState.set(initial);
    await this.loadRates();
    this.startPeriodicRefresh();
    this.readyState.set(true);
  }

  /** Switch display currency instantly and persist preference. */
  async setCurrency(code: SupportedCurrencyCode): Promise<void> {
    if (code === this.currencyState()) {
      return;
    }

    this.currencyState.set(code);
    this.persistCurrency(code);
    void this.syncPreferredCurrencyToServer(code);
  }

  /** Apply saved server preference after authentication. */
  async syncFromAuthenticatedUser(): Promise<void> {
    if (!this.session.isAuthenticated()) {
      return;
    }

    try {
      const profile = await firstValueFrom(this.api.get<UserLocaleProfile>(AUTH_API.me));
      if (isSupportedCurrencyCode(profile.preferredCurrency)) {
        this.currencyState.set(profile.preferredCurrency);
        this.persistCurrency(profile.preferredCurrency);
      }
    } catch {
      // Keep client-side preference when profile sync fails.
    }
  }

  /** Convert a stored USD amount into the active display currency. */
  convertFromBase(amountUsd: number): number {
    const rate = this.ratesState()[this.currencyState()] ?? 1;
    return amountUsd * rate;
  }

  /** Format a stored USD amount using locale + active currency. */
  format(amountUsd: number | null | undefined, digitsInfo = '1.2-2'): string {
    if (amountUsd === null || amountUsd === undefined || Number.isNaN(amountUsd)) {
      return '';
    }

    const converted = this.convertFromBase(amountUsd);
    const locale = this.translation.currentLanguage().angularLocale;
    const currencyCode = this.currencyState();
    const fraction = digitsInfo.split('.')[1];
    const minimumFractionDigits = Number(fraction?.split('-')[0] ?? 2);
    const maximumFractionDigits = Number(fraction?.split('-')[1] ?? minimumFractionDigits);

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'symbol',
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(converted);
  }

  /** Force-refresh exchange rates from API/cache. */
  async refreshRates(): Promise<void> {
    await this.loadRates(true);
  }

  private async loadRates(force = false): Promise<void> {
    if (!force) {
      const cached = this.readCachedRates();
      if (cached) {
        this.ratesState.set(cached.rates);
      }
    }

    try {
      const response = await firstValueFrom(
        this.api.get<ExchangeRatesResponse>(LOCALIZATION_API.exchangeRates),
      );

      const rates = this.normalizeRates(response.rates);
      this.ratesState.set(rates);
      this.writeCachedRates(rates);
    } catch {
      const cached = this.readCachedRates();
      if (cached) {
        this.ratesState.set(cached.rates);
      } else {
        this.ratesState.set({ ...DEFAULT_EXCHANGE_RATES });
      }
    }
  }

  private normalizeRates(rates: Readonly<Record<string, number>>): Readonly<Record<string, number>> {
    const normalized: Record<string, number> = { ...DEFAULT_EXCHANGE_RATES };

    for (const currency of AVAILABLE_CURRENCIES) {
      const rate = rates[currency.code];
      if (typeof rate === 'number' && rate > 0) {
        normalized[currency.code] = rate;
      }
    }

    normalized[BASE_CURRENCY_CODE] = 1;
    return normalized;
  }

  private resolveInitialCurrency(): SupportedCurrencyCode {
    const stored = typeof localStorage !== 'undefined'
      ? localStorage.getItem(CURRENCY_STORAGE_KEY)
      : null;

    return isSupportedCurrencyCode(stored) ? stored : DEFAULT_CURRENCY_CODE;
  }

  private persistCurrency(code: SupportedCurrencyCode): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CURRENCY_STORAGE_KEY, code);
    }
  }

  private readCachedRates(): CachedRates | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const raw = localStorage.getItem(EXCHANGE_RATES_CACHE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as CachedRates;
      if (!parsed?.rates || Date.now() - parsed.updatedAt > EXCHANGE_RATES_REFRESH_MS * 2) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  private writeCachedRates(rates: Readonly<Record<string, number>>): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const payload: CachedRates = {
      rates,
      updatedAt: Date.now(),
    };

    localStorage.setItem(EXCHANGE_RATES_CACHE_KEY, JSON.stringify(payload));
  }

  private startPeriodicRefresh(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.refreshTimer ??= setInterval(() => {
      void this.refreshRates();
    }, EXCHANGE_RATES_REFRESH_MS);
  }

  private async syncPreferredCurrencyToServer(code: SupportedCurrencyCode): Promise<void> {
    if (!this.session.isAuthenticated()) {
      return;
    }

    try {
      const profile = await firstValueFrom(this.api.get<UserLocaleProfile>(AUTH_API.me));
      await firstValueFrom(
        this.api.patch(AUTH_API.me, {
          firstName: profile.firstName,
          lastName: profile.lastName,
          phoneNumber: profile.phoneNumber,
          preferredLanguage: profile.preferredLanguage,
          preferredCurrency: code,
        }),
      );
    } catch {
      // Local preference still applies.
    }
  }
}

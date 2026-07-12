import { Injectable } from '@angular/core';

import { AuthContextType } from './auth-context';

const STORAGE_KEYS: Record<AuthContextType, { access: string; refresh: string; expires: string }> = {
  customer: {
    access: 'hambox.customer.accessToken',
    refresh: 'hambox.customer.refreshToken',
    expires: 'hambox.customer.expiresAt',
  },
  admin: {
    access: 'hambox.admin.accessToken',
    refresh: 'hambox.admin.refreshToken',
    expires: 'hambox.admin.expiresAt',
  },
};

export interface StoredTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class TokenStorageService {
  getTokens(context: AuthContextType): StoredTokens | null {
    const keys = STORAGE_KEYS[context];
    const accessToken = this.read(keys.access);
    const refreshToken = this.read(keys.refresh);
    const expiresAt = this.read(keys.expires);

    if (!accessToken || !refreshToken || !expiresAt) {
      return null;
    }

    return { accessToken, refreshToken, expiresAt };
  }

  saveTokens(context: AuthContextType, tokens: StoredTokens): void {
    const keys = STORAGE_KEYS[context];
    this.write(keys.access, tokens.accessToken);
    this.write(keys.refresh, tokens.refreshToken);
    this.write(keys.expires, tokens.expiresAt);
  }

  clearTokens(context: AuthContextType): void {
    const keys = STORAGE_KEYS[context];
    this.remove(keys.access);
    this.remove(keys.refresh);
    this.remove(keys.expires);
  }

  clearAll(): void {
    this.clearTokens('customer');
    this.clearTokens('admin');
  }

  getRefreshToken(context: AuthContextType): string | null {
    return this.read(STORAGE_KEYS[context].refresh);
  }

  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private write(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore storage failures.
    }
  }

  private remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage failures.
    }
  }
}

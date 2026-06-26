import { Injectable } from '@angular/core';

const ACCESS_TOKEN_KEY = 'hambox.accessToken';
const REFRESH_TOKEN_KEY = 'hambox.refreshToken';
const EXPIRES_AT_KEY = 'hambox.expiresAt';

export interface StoredTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class TokenStorageService {
  getTokens(): StoredTokens | null {
    const accessToken = this.read(ACCESS_TOKEN_KEY);
    const refreshToken = this.read(REFRESH_TOKEN_KEY);
    const expiresAt = this.read(EXPIRES_AT_KEY);

    if (!accessToken || !refreshToken || !expiresAt) {
      return null;
    }

    return { accessToken, refreshToken, expiresAt };
  }

  saveTokens(tokens: StoredTokens): void {
    this.write(ACCESS_TOKEN_KEY, tokens.accessToken);
    this.write(REFRESH_TOKEN_KEY, tokens.refreshToken);
    this.write(EXPIRES_AT_KEY, tokens.expiresAt);
  }

  clearTokens(): void {
    this.remove(ACCESS_TOKEN_KEY);
    this.remove(REFRESH_TOKEN_KEY);
    this.remove(EXPIRES_AT_KEY);
  }

  getRefreshToken(): string | null {
    return this.read(REFRESH_TOKEN_KEY);
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
      // Ignore storage failures (private mode, quota exceeded).
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

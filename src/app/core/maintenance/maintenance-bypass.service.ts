import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiClientService } from '../api/api-client.service';
import { AUTH_API } from '../api/api-endpoints';
import { readJson, removeKey, writeJson } from './maintenance-storage';

const STORAGE_KEY = 'hambox.maintenanceBypass';

interface StoredBypass {
  readonly token: string;
  readonly expiresOnUtc: string;
}

interface MaintenanceBypassResponse {
  readonly token: string;
  readonly expiresOnUtc: string;
}

@Injectable({ providedIn: 'root' })
export class MaintenanceBypassService {
  private readonly api = inject(ApiClientService);

  private readonly storedState = signal<StoredBypass | null>(readJson<StoredBypass>(STORAGE_KEY));

  /**
   * Local, optimistic check: the stamp we were handed at issue time has not lapsed yet. Only the
   * server can actually confirm a token — it is Data Protection material, and its key ring can
   * rotate under us — so treat this as "worth sending", never as proof of access. When the server
   * disagrees it answers 503 MAINTENANCE and the error interceptor calls {@link clear}.
   */
  readonly hasValidToken = () => {
    const stored = this.storedState();
    if (!stored) {
      return false;
    }

    const expiresAt = new Date(stored.expiresOnUtc).getTime();
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
  };

  getToken(): string | null {
    return this.hasValidToken() ? this.storedState()!.token : null;
  }

  /** Drops the stored token so the visitor is asked for the bypass password again. */
  clear(): void {
    if (!this.storedState()) {
      return;
    }

    this.storedState.set(null);
    removeKey(STORAGE_KEY);
  }

  async verify(password: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.api.post<MaintenanceBypassResponse>(AUTH_API.maintenanceBypass, { password }),
      );
      const stored: StoredBypass = { token: response.token, expiresOnUtc: response.expiresOnUtc };
      this.storedState.set(stored);
      // Persist outside the try that decides success: the password was correct, and a browser
      // that refuses to store must not report that back to the visitor as a wrong password.
      writeJson(STORAGE_KEY, stored);
      return true;
    } catch {
      return false;
    }
  }
}

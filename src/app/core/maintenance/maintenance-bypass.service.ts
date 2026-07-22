import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiClientService } from '../api/api-client.service';
import { AUTH_API } from '../api/api-endpoints';

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

  private readonly storedState = signal<StoredBypass | null>(this.readStored());

  readonly hasValidToken = () => {
    const stored = this.storedState();
    return !!stored && new Date(stored.expiresOnUtc).getTime() > Date.now();
  };

  getToken(): string | null {
    return this.hasValidToken() ? this.storedState()!.token : null;
  }

  async verify(email: string, password: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.api.post<MaintenanceBypassResponse>(AUTH_API.maintenanceBypass, { email, password }),
      );
      const stored: StoredBypass = { token: response.token, expiresOnUtc: response.expiresOnUtc };
      this.storedState.set(stored);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      return true;
    } catch {
      return false;
    }
  }

  private readStored(): StoredBypass | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as StoredBypass;
    } catch {
      return null;
    }
  }
}

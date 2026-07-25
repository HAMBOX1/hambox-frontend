import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiClientService } from '../api/api-client.service';
import { SETTINGS_API } from '../api/api-endpoints';

interface MaintenanceSettingsPayload {
  readonly enabled: boolean;
  readonly message: string;
  readonly allowedRoleNames: readonly string[];
}

interface PublicPlatformSettingsResponse {
  readonly maintenance: MaintenanceSettingsPayload;
}

const STORAGE_KEY = 'hambox.maintenanceState';

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private readonly api = inject(ApiClientService);

  private readonly lastKnown = this.readStored();
  private readonly enabledState = signal(this.lastKnown?.enabled ?? false);
  private readonly messageState = signal(this.lastKnown?.message ?? '');

  readonly enabled = this.enabledState.asReadonly();
  readonly message = this.messageState.asReadonly();

  async init(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.api.get<PublicPlatformSettingsResponse>(SETTINGS_API.publicSettings),
      );
      const enabled = response.maintenance?.enabled ?? false;
      const message = response.maintenance?.message ?? '';
      this.enabledState.set(enabled);
      this.messageState.set(message);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled, message }));
    } catch {
      // The settings fetch itself failed (e.g. backend restarting mid-deploy) — keep the
      // last known state instead of assuming maintenance is off, so a transient outage
      // right when maintenance is toggled on doesn't let visitors slip past coming-soon.
    }
  }

  private readStored(): MaintenanceSettingsPayload | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as MaintenanceSettingsPayload) : null;
    } catch {
      return null;
    }
  }
}

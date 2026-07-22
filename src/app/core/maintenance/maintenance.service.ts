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

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private readonly api = inject(ApiClientService);

  private readonly enabledState = signal(false);
  private readonly messageState = signal('');

  readonly enabled = this.enabledState.asReadonly();
  readonly message = this.messageState.asReadonly();

  async init(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.api.get<PublicPlatformSettingsResponse>(SETTINGS_API.publicSettings),
      );
      this.enabledState.set(response.maintenance?.enabled ?? false);
      this.messageState.set(response.maintenance?.message ?? '');
    } catch {
      // Best-effort: if the check itself fails, do not lock visitors out of the site.
      this.enabledState.set(false);
    }
  }
}

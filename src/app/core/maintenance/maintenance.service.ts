import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiClientService } from '../api/api-client.service';
import { SETTINGS_API } from '../api/api-endpoints';
import { readJson, writeJson } from './maintenance-storage';

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

  private readonly lastKnown = readJson<MaintenanceSettingsPayload>(STORAGE_KEY);
  private readonly enabledState = signal(this.lastKnown?.enabled ?? false);
  private readonly messageState = signal(this.lastKnown?.message ?? '');

  /** Set once a live 503 MAINTENANCE has proven the backend is gating traffic right now. */
  private serverConfirmed = false;

  readonly enabled = this.enabledState.asReadonly();
  readonly message = this.messageState.asReadonly();

  /**
   * Called by the error interceptor when the backend's MaintenanceModeMiddleware rejects a
   * request with 503 MAINTENANCE — that response is the authoritative signal, so it must win
   * even if our own flag fetch raced it or returned stale/cached state.
   */
  markEnabled(message?: string): void {
    const resolvedMessage = message ?? this.messageState();
    this.serverConfirmed = true;
    this.enabledState.set(true);
    this.messageState.set(resolvedMessage);
    writeJson(STORAGE_KEY, { enabled: true, message: resolvedMessage });
  }

  async init(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.api.get<PublicPlatformSettingsResponse>(SETTINGS_API.publicSettings),
      );
      const enabled = response.maintenance?.enabled ?? false;
      const message = response.maintenance?.message ?? '';

      // Bootstrap calls that are not awaited here (theme engine, currency) can take a 503 while
      // this fetch is still in flight, and a settings response may itself be served from the
      // browser's heuristic HTTP cache. Never let either downgrade a maintenance state the
      // server has already confirmed for this page load — doing so lets a visitor onto the
      // storefront, whose own calls 503 straight back to /coming-soon.
      if (!enabled && this.serverConfirmed) {
        return;
      }

      this.enabledState.set(enabled);
      this.messageState.set(message);
      writeJson(STORAGE_KEY, { enabled, message });
    } catch {
      // The settings fetch itself failed (e.g. backend restarting mid-deploy) — keep the
      // last known state instead of assuming maintenance is off, so a transient outage
      // right when maintenance is toggled on doesn't let visitors slip past coming-soon.
    }
  }
}

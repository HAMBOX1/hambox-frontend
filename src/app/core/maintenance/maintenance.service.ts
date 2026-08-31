import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiClientService } from '../api/api-client.service';
import { SETTINGS_API } from '../api/api-endpoints';
import { readJson, writeJson } from './maintenance-storage';

export type MaintenanceGateReason = 'maintenance' | 'closed' | 'comingSoon';

interface MaintenanceSettingsPayload {
  readonly enabled: boolean;
  readonly message: string;
  readonly allowedRoleNames: readonly string[];
}

interface GeneralSettingsPayload {
  readonly storeStatus: string;
}

interface PublicPlatformSettingsResponse {
  readonly general: GeneralSettingsPayload;
  readonly maintenance: MaintenanceSettingsPayload;
}

interface StoredGateState {
  readonly enabled: boolean;
  readonly message: string;
  readonly reason: MaintenanceGateReason;
}

const STORAGE_KEY = 'hambox.maintenanceState';

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private readonly api = inject(ApiClientService);

  private readonly lastKnown = readJson<StoredGateState>(STORAGE_KEY);
  private readonly enabledState = signal(this.lastKnown?.enabled ?? false);
  private readonly messageState = signal(this.lastKnown?.message ?? '');
  private readonly reasonState = signal<MaintenanceGateReason>(this.lastKnown?.reason ?? 'maintenance');

  /** Set once a live 503 has proven the backend is gating traffic right now. */
  private serverConfirmed = false;

  readonly enabled = this.enabledState.asReadonly();
  readonly message = this.messageState.asReadonly();
  readonly reason = this.reasonState.asReadonly();

  /**
   * Called by the error interceptor when the backend's MaintenanceModeMiddleware rejects a
   * request with a 503 gate code — that response is the authoritative signal, so it must win
   * even if our own flag fetch raced it or returned stale/cached state.
   */
  markEnabled(reason: MaintenanceGateReason, message?: string): void {
    const resolvedMessage = message ?? this.messageState();
    this.serverConfirmed = true;
    this.enabledState.set(true);
    this.messageState.set(resolvedMessage);
    this.reasonState.set(reason);
    writeJson(STORAGE_KEY, { enabled: true, message: resolvedMessage, reason });
  }

  async init(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.api.get<PublicPlatformSettingsResponse>(SETTINGS_API.publicSettings),
      );

      const maintenanceEnabled = response.maintenance?.enabled ?? false;
      const storeStatus = response.general?.storeStatus ?? 'Open';

      let enabled = maintenanceEnabled;
      let reason: MaintenanceGateReason = 'maintenance';
      let message = response.maintenance?.message ?? '';

      if (!maintenanceEnabled) {
        if (storeStatus === 'Closed') {
          enabled = true;
          reason = 'closed';
          message = '';
        } else if (storeStatus === 'ComingSoon') {
          enabled = true;
          reason = 'comingSoon';
          message = '';
        }
      }

      // Bootstrap calls that are not awaited here (theme engine, currency) can take a 503 while
      // this fetch is still in flight, and a settings response may itself be served from the
      // browser's heuristic HTTP cache. Never let either downgrade a gate state the server has
      // already confirmed for this page load — doing so lets a visitor onto the storefront,
      // whose own calls 503 straight back to /coming-soon.
      if (!enabled && this.serverConfirmed) {
        return;
      }

      this.enabledState.set(enabled);
      this.messageState.set(message);
      this.reasonState.set(reason);
      writeJson(STORAGE_KEY, { enabled, message, reason });
    } catch {
      // The settings fetch itself failed (e.g. backend restarting mid-deploy) — keep the
      // last known state instead of assuming the gate is off, so a transient outage right
      // when it's toggled on doesn't let visitors slip past coming-soon.
    }
  }
}

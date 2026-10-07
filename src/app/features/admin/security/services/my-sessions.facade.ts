import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';

import { ApiClientService } from '../../../../core/api/api-client.service';
import { AUTH_API } from '../../../../core/api/api-endpoints';
import { ApiError } from '../../../../core/models/api-error.model';
import { UserSessionDto } from '../models/security.model';

/**
 * Self-service "my own sessions" facade — distinct from `SecurityManagementFacade`, which is the
 * admin investigator tool for inspecting *other* users' sessions. Backed by the same
 * `api/auth/sessions*` endpoints every authenticated user (admin or customer) can call about
 * themselves.
 */
@Injectable()
export class MySessionsFacade {
  private readonly api = inject(ApiClientService);

  private readonly sessionsState = signal<readonly UserSessionDto[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly actionLoadingState = signal(false);

  readonly sessions = computed(() =>
    [...this.sessionsState()].sort((a, b) => (a.isCurrent === b.isCurrent ? 0 : a.isCurrent ? -1 : 1)),
  );
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly actionLoading = this.actionLoadingState.asReadonly();

  async loadSessions(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const result = await firstValueFrom(this.api.get<readonly UserSessionDto[]>(AUTH_API.sessions));
      this.sessionsState.set(result);
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to load sessions.'));
    } finally {
      this.loadingState.set(false);
    }
  }

  async revokeSession(sessionId: string): Promise<boolean> {
    return this.runAction(() => this.api.delete<void>(AUTH_API.revokeSession(sessionId)));
  }

  async revokeAllOtherSessions(): Promise<boolean> {
    return this.runAction(() => this.api.post<void>(AUTH_API.revokeAllSessions));
  }

  private async runAction(call: () => Observable<void>): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.errorState.set(null);

    try {
      await firstValueFrom(call());
      return true;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to update sessions.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403) {
        return 'You do not have permission to perform this action.';
      }

      return error.message;
    }

    return fallback;
  }
}

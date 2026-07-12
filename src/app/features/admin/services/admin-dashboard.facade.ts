import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AUTH_CONTEXT } from '../../../core/auth/auth-context';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { PERMISSIONS } from '../../../core/permissions/permission.constants';
import { PermissionService } from '../../../core/permissions/permission.service';
import { DASHBOARD_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import { ApiError } from '../../../core/models/api-error.model';
import { AdminDashboardDto } from '../models/admin-dashboard.model';

@Injectable()
export class AdminDashboardFacade {
  private readonly api = inject(ApiClientService);
  private readonly session = inject(AuthSessionService);
  private readonly permissions = inject(PermissionService);

  private readonly dashboardState = signal<AdminDashboardDto | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly dashboard = this.dashboardState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  async load(): Promise<void> {
    if (!this.session.isAdminAuthenticated()) {
      return;
    }

    if (!this.permissions.hasPermission(PERMISSIONS.Dashboard.View)) {
      this.errorState.set('You do not have permission to view the dashboard.');
      return;
    }

    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const data = await firstValueFrom(
        this.api.get<AdminDashboardDto>(DASHBOARD_API.overview),
      );
      this.dashboardState.set(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        this.session.clearSession(AUTH_CONTEXT.Admin);
        this.errorState.set(null);
        return;
      }

      this.errorState.set(this.resolveError(error));
    } finally {
      this.loadingState.set(false);
    }
  }

  private resolveError(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }

    return 'Unable to load dashboard data.';
  }
}
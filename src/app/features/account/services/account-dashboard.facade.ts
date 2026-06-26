import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AccountDashboardApiDto } from '../models/account-api.model';
import { AccountApiService } from './account-api.service';

@Injectable({
  providedIn: 'root',
})
export class AccountDashboardFacade {
  private readonly api = inject(AccountApiService);

  private readonly dashboardState = signal<AccountDashboardApiDto | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly dashboard = this.dashboardState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  readonly membership = computed(() => this.dashboardState()?.membership ?? null);
  readonly wishlistPreview = computed(() => this.dashboardState()?.wishlistPreview ?? []);
  readonly referral = computed(() => this.dashboardState()?.referral ?? null);
  readonly recentActivity = computed(() => this.dashboardState()?.recentActivity ?? []);
  readonly unreadCount = computed(() => this.dashboardState()?.unreadNotificationCount ?? 0);

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const dashboard = await firstValueFrom(this.api.getDashboard());
      this.dashboardState.set(dashboard);
    } catch {
      this.dashboardState.set(null);
      this.errorState.set('Unable to load your dashboard.');
    } finally {
      this.loadingState.set(false);
    }
  }
}

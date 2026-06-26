import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ReferralDashboardApiDto } from '../models/account-api.model';
import { AccountApiService } from './account-api.service';
import { referralInviteLink, referralTierProgress } from '../utils/referral-tier.util';

@Injectable({
  providedIn: 'root',
})
export class AccountReferralFacade {
  private readonly api = inject(AccountApiService);

  private readonly dashboardState = signal<ReferralDashboardApiDto | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly copiedState = signal(false);

  readonly dashboard = this.dashboardState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly copied = this.copiedState.asReadonly();

  readonly inviteLink = computed(() => {
    const code = this.dashboardState()?.referralCode;
    if (!code) {
      return '';
    }

    return referralInviteLink(code);
  });

  readonly tierProgress = computed(() => {
    const dashboard = this.dashboardState();
    if (!dashboard) {
      return 0;
    }

    return referralTierProgress(dashboard.tier, dashboard.lifetimePoints);
  });

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const dashboard = await firstValueFrom(this.api.getReferralDashboard());
      this.dashboardState.set(dashboard);
    } catch {
      this.dashboardState.set(null);
      this.errorState.set('Unable to load referral dashboard.');
    } finally {
      this.loadingState.set(false);
    }
  }

  async copyInviteLink(): Promise<void> {
    const link = this.inviteLink();
    if (!link || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(link);
    this.copiedState.set(true);
    setTimeout(() => this.copiedState.set(false), 2000);
  }
}

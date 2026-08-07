import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ReferralDashboardApiDto, ReferralHistoryApiDto } from '../models/account-api.model';
import { AccountApiService } from './account-api.service';
import { referralInviteLink, referralTierProgress } from '../utils/referral-tier.util';

const SEARCH_DEBOUNCE_MS = 300;

@Injectable({
  providedIn: 'root',
})
export class AccountReferralFacade {
  private readonly api = inject(AccountApiService);

  private readonly dashboardState = signal<ReferralDashboardApiDto | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly copiedState = signal(false);

  private readonly historyState = signal<readonly ReferralHistoryApiDto[]>([]);
  private readonly historyLoadingState = signal(false);
  private readonly searchState = signal('');
  private readonly statusFilterState = signal('');
  private readonly pageNumberState = signal(1);
  private readonly pageSizeState = signal(10);
  private readonly totalCountState = signal(0);

  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  readonly dashboard = this.dashboardState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly copied = this.copiedState.asReadonly();

  readonly history = this.historyState.asReadonly();
  readonly historyLoading = this.historyLoadingState.asReadonly();
  readonly search = this.searchState.asReadonly();
  readonly statusFilter = this.statusFilterState.asReadonly();
  readonly pageNumber = this.pageNumberState.asReadonly();
  readonly pageSize = this.pageSizeState.asReadonly();
  readonly totalCount = this.totalCountState.asReadonly();

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCountState() / this.pageSizeState())));

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

  readonly lifetimePointsValue = computed(() => {
    const dashboard = this.dashboardState();
    return dashboard ? dashboard.lifetimePoints * dashboard.pointValueUsd : 0;
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

  async loadHistory(): Promise<void> {
    this.historyLoadingState.set(true);

    try {
      const result = await firstValueFrom(
        this.api.getReferralHistory({
          pageNumber: this.pageNumberState(),
          pageSize: this.pageSizeState(),
          search: this.searchState() || undefined,
          status: this.statusFilterState() || undefined,
        }),
      );

      this.historyState.set(result.items ?? []);
      this.totalCountState.set(result.totalCount ?? 0);
      this.pageNumberState.set(result.pageNumber ?? this.pageNumberState());
      this.pageSizeState.set(result.pageSize ?? this.pageSizeState());
    } catch {
      this.historyState.set([]);
      this.totalCountState.set(0);
    } finally {
      this.historyLoadingState.set(false);
    }
  }

  setSearch(term: string): void {
    this.searchState.set(term);
    this.pageNumberState.set(1);

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      void this.loadHistory();
    }, SEARCH_DEBOUNCE_MS);
  }

  setStatusFilter(status: string): void {
    this.statusFilterState.set(status);
    this.pageNumberState.set(1);
    void this.loadHistory();
  }

  setPage(pageNumber: number): void {
    this.pageNumberState.set(Math.max(1, pageNumber));
    void this.loadHistory();
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

import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ADMIN_REFERRALS_API } from '../../../../core/api/api-endpoints';
import { ApiClientService } from '../../../../core/api/api-client.service';
import { ApiError } from '../../../../core/models/api-error.model';
import { PagedResult } from '../../../catalog/models/category.model';
import { AdminReferralDetailDto, AdminReferralListItemDto } from '../models/admin-referral.model';

const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

@Injectable()
export class AdminReferralsFacade {
  private readonly api = inject(ApiClientService);

  private readonly referralsState = signal<readonly AdminReferralListItemDto[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly searchTermState = signal('');
  private readonly statusFilterState = signal('');
  private readonly totalCountState = signal(0);
  private readonly pageNumberState = signal(1);
  private readonly pageSizeState = signal(DEFAULT_PAGE_SIZE);

  private readonly detailState = signal<AdminReferralDetailDto | null>(null);
  private readonly detailLoadingState = signal(false);
  private readonly detailErrorState = signal<string | null>(null);

  private readonly actionLoadingState = signal(false);

  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  readonly referrals = this.referralsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly searchTerm = this.searchTermState.asReadonly();
  readonly statusFilter = this.statusFilterState.asReadonly();
  readonly totalCount = this.totalCountState.asReadonly();
  readonly pageNumber = this.pageNumberState.asReadonly();
  readonly pageSize = this.pageSizeState.asReadonly();

  readonly detail = this.detailState.asReadonly();
  readonly detailLoading = this.detailLoadingState.asReadonly();
  readonly detailError = this.detailErrorState.asReadonly();

  readonly actionLoading = this.actionLoadingState.asReadonly();

  loadReferrals(): void {
    void this.fetchReferrals();
  }

  reloadReferrals(): Promise<void> {
    return this.fetchReferrals();
  }

  setSearchTerm(term: string): void {
    this.searchTermState.set(term);
    this.pageNumberState.set(1);
    this.scheduleReload();
  }

  setStatusFilter(status: string): void {
    this.statusFilterState.set(status);
    this.pageNumberState.set(1);
    void this.fetchReferrals();
  }

  setPage(pageNumber: number, pageSize: number): void {
    this.pageNumberState.set(pageNumber);
    this.pageSizeState.set(pageSize);
    void this.fetchReferrals();
  }

  async loadDetail(referralId: string): Promise<void> {
    this.detailLoadingState.set(true);
    this.detailErrorState.set(null);

    try {
      const detail = await firstValueFrom(
        this.api.get<AdminReferralDetailDto>(ADMIN_REFERRALS_API.referral(referralId)),
      );
      this.detailState.set(detail);
    } catch (error) {
      this.detailState.set(null);
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to load referral details.'));
    } finally {
      this.detailLoadingState.set(false);
    }
  }

  clearDetail(): void {
    this.detailState.set(null);
    this.detailErrorState.set(null);
  }

  async reverseReferral(referralId: string): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.errorState.set(null);

    try {
      const detail = await firstValueFrom(
        this.api.post<AdminReferralDetailDto>(ADMIN_REFERRALS_API.reverse(referralId), {}),
      );
      this.detailState.set(detail);
      this.updateListItem(detail.referral);
      return true;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to reverse this referral.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  private updateListItem(updated: AdminReferralListItemDto): void {
    this.referralsState.update((items) =>
      items.map((item) => (item.id === updated.id ? updated : item)),
    );
  }

  private scheduleReload(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      void this.fetchReferrals();
    }, SEARCH_DEBOUNCE_MS);
  }

  private async fetchReferrals(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const result = await firstValueFrom(
        this.api.get<PagedResult<AdminReferralListItemDto>>(ADMIN_REFERRALS_API.referrals, {
          params: {
            pageNumber: this.pageNumberState(),
            pageSize: this.pageSizeState(),
            ...(this.searchTermState().trim() ? { searchTerm: this.searchTermState().trim() } : {}),
            ...(this.statusFilterState() ? { status: this.statusFilterState() } : {}),
          },
        }),
      );

      this.referralsState.set(result.items ?? []);
      this.totalCountState.set(result.totalCount ?? 0);
    } catch (error) {
      this.referralsState.set([]);
      this.totalCountState.set(0);
      this.errorState.set(this.toErrorMessage(error, 'Failed to load referrals.'));
    } finally {
      this.loadingState.set(false);
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

import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { MEMBERSHIPS_API, ROLES_API } from '../../../../core/api/api-endpoints';
import { ApiClientService } from '../../../../core/api/api-client.service';
import { ApiError } from '../../../../core/models/api-error.model';
import { PagedResult } from '../../../catalog/models/category.model';
import { UserSearchResultApiDto } from '../../roles/models/role-api.model';
import {
  AssignMembershipRequest,
  BulkAssignMembershipRequest,
  ChangeMembershipPlanRequest,
  CreateMembershipPlanRequest,
  DuplicateMembershipPlanRequest,
  MemberListItemDto,
  MemberListResult,
  MembershipPlanDetailDto,
  MembershipPlanListItemDto,
  MembershipPlanListQuery,
  MembershipPlanListResult,
  MembershipStatisticsDto,
  PlanComparisonDto,
  UpdateMembershipPlanRequest,
} from '../models/membership-api.model';

const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

@Injectable()
export class MembershipManagementFacade {
  private readonly api = inject(ApiClientService);

  private readonly plansState = signal<readonly MembershipPlanListItemDto[]>([]);
  private readonly plansLoadingState = signal(false);
  private readonly plansErrorState = signal<string | null>(null);
  private readonly searchTermState = signal('');
  private readonly statusFilterState = signal('all');
  private readonly totalCountState = signal(0);
  private readonly pageNumberState = signal(1);
  private readonly pageSizeState = signal(DEFAULT_PAGE_SIZE);
  private readonly hasLoadedPlansState = signal(false);

  private readonly detailState = signal<MembershipPlanDetailDto | null>(null);
  private readonly detailLoadingState = signal(false);
  private readonly detailSavingState = signal(false);
  private readonly detailErrorState = signal<string | null>(null);

  private readonly statisticsState = signal<MembershipStatisticsDto | null>(null);
  private readonly statisticsLoadingState = signal(false);
  private readonly statisticsErrorState = signal<string | null>(null);

  private readonly comparisonState = signal<PlanComparisonDto | null>(null);
  private readonly comparisonLoadingState = signal(false);
  private readonly comparisonErrorState = signal<string | null>(null);

  private readonly membersState = signal<readonly MemberListItemDto[]>([]);
  private readonly membersLoadingState = signal(false);
  private readonly membersErrorState = signal<string | null>(null);
  private readonly membersSearchState = signal('');
  private readonly membersTotalState = signal(0);
  private readonly membersPageState = signal(1);
  private readonly membersPageSizeState = signal(20);

  private readonly actionLoadingState = signal(false);

  private readonly userSearchResultsState = signal<readonly UserSearchResultApiDto[]>([]);
  private readonly userSearchLoadingState = signal(false);
  private readonly userSearchTermState = signal('');

  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  private membersSearchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  private userSearchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  readonly plans = this.plansState.asReadonly();
  readonly plansLoading = this.plansLoadingState.asReadonly();
  readonly plansError = this.plansErrorState.asReadonly();
  readonly searchTerm = this.searchTermState.asReadonly();
  readonly statusFilter = this.statusFilterState.asReadonly();
  readonly totalCount = this.totalCountState.asReadonly();
  readonly pageNumber = this.pageNumberState.asReadonly();
  readonly pageSize = this.pageSizeState.asReadonly();

  readonly detail = this.detailState.asReadonly();
  readonly detailLoading = this.detailLoadingState.asReadonly();
  readonly detailSaving = this.detailSavingState.asReadonly();
  readonly detailError = this.detailErrorState.asReadonly();

  readonly statistics = this.statisticsState.asReadonly();
  readonly statisticsLoading = this.statisticsLoadingState.asReadonly();
  readonly statisticsError = this.statisticsErrorState.asReadonly();

  readonly comparison = this.comparisonState.asReadonly();
  readonly comparisonLoading = this.comparisonLoadingState.asReadonly();
  readonly comparisonError = this.comparisonErrorState.asReadonly();

  readonly members = this.membersState.asReadonly();
  readonly membersLoading = this.membersLoadingState.asReadonly();
  readonly membersError = this.membersErrorState.asReadonly();
  readonly membersSearch = this.membersSearchState.asReadonly();
  readonly membersTotal = this.membersTotalState.asReadonly();
  readonly membersPage = this.membersPageState.asReadonly();
  readonly membersPageSize = this.membersPageSizeState.asReadonly();

  readonly actionLoading = this.actionLoadingState.asReadonly();

  readonly userSearchResults = this.userSearchResultsState.asReadonly();
  readonly userSearchLoading = this.userSearchLoadingState.asReadonly();
  readonly userSearchTerm = this.userSearchTermState.asReadonly();

  readonly hasActiveFilters = computed(
    () => this.searchTermState().trim().length > 0 || this.statusFilterState() !== 'all',
  );

  readonly listStats = computed(() => {
    const items = this.plansState();
    const stats = this.statisticsState();
    return {
      total: stats?.totalPlans ?? this.totalCountState(),
      active: stats?.activePlans ?? items.filter((item) => item.status === 'Active').length,
      subscribers: stats?.activeSubscriptions ?? items.reduce((sum, item) => sum + item.activeSubscribers, 0),
      expiring: stats?.expiringWithin7Days ?? 0,
    };
  });

  loadPlans(): void {
    void this.fetchPlans(true);
  }

  reloadPlans(): Promise<void> {
    return this.fetchPlans(true);
  }

  setSearchTerm(term: string): void {
    this.searchTermState.set(term);
    this.pageNumberState.set(1);
    this.schedulePlansReload();
  }

  setStatusFilter(status: string): void {
    this.statusFilterState.set(status);
    this.pageNumberState.set(1);
    void this.fetchPlans();
  }

  setPage(pageNumber: number, pageSize: number): void {
    if (
      this.pageNumberState() === pageNumber &&
      this.pageSizeState() === pageSize &&
      this.hasLoadedPlansState()
    ) {
      return;
    }

    this.pageNumberState.set(pageNumber);
    this.pageSizeState.set(pageSize);
    void this.fetchPlans();
  }

  async loadDetail(planId: string): Promise<void> {
    this.detailLoadingState.set(true);
    this.detailErrorState.set(null);

    try {
      const detail = await firstValueFrom(
        this.api.get<MembershipPlanDetailDto>(MEMBERSHIPS_API.plan(planId)),
      );
      this.detailState.set(detail);
    } catch (error) {
      this.detailState.set(null);
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to load membership plan.'));
    } finally {
      this.detailLoadingState.set(false);
    }
  }

  resetDetail(): void {
    this.detailState.set(null);
    this.detailErrorState.set(null);
    this.comparisonState.set(null);
    this.membersState.set([]);
  }

  async loadStatistics(): Promise<void> {
    this.statisticsLoadingState.set(true);
    this.statisticsErrorState.set(null);

    try {
      const stats = await firstValueFrom(
        this.api.get<MembershipStatisticsDto>(MEMBERSHIPS_API.statistics),
      );
      this.statisticsState.set(stats);
    } catch (error) {
      this.statisticsState.set(null);
      this.statisticsErrorState.set(this.toErrorMessage(error, 'Failed to load statistics.'));
    } finally {
      this.statisticsLoadingState.set(false);
    }
  }

  async loadComparison(): Promise<void> {
    this.comparisonLoadingState.set(true);
    this.comparisonErrorState.set(null);

    try {
      const comparison = await firstValueFrom(
        this.api.get<PlanComparisonDto>(MEMBERSHIPS_API.compare),
      );
      this.comparisonState.set(comparison);
    } catch (error) {
      this.comparisonState.set(null);
      this.comparisonErrorState.set(this.toErrorMessage(error, 'Failed to load plan comparison.'));
    } finally {
      this.comparisonLoadingState.set(false);
    }
  }

  loadMembers(): void {
    void this.fetchMembers();
  }

  setMembersSearch(term: string): void {
    this.membersSearchState.set(term);
    this.membersPageState.set(1);
    this.scheduleMembersReload();
  }

  setMembersPage(pageNumber: number, pageSize: number): void {
    this.membersPageState.set(pageNumber);
    this.membersPageSizeState.set(pageSize);
    void this.fetchMembers();
  }

  /** Reuses the same user lookup the Roles module exposes (gated by Users.View) instead of
   * requiring the admin to type a raw user id when assigning a membership. */
  searchUsersForAssign(term: string): void {
    this.userSearchTermState.set(term);
    if (this.userSearchDebounceTimer) {
      clearTimeout(this.userSearchDebounceTimer);
    }

    this.userSearchDebounceTimer = setTimeout(() => {
      void this.fetchUserSearch();
    }, SEARCH_DEBOUNCE_MS);
  }

  resetUserSearch(): void {
    this.userSearchTermState.set('');
    this.userSearchResultsState.set([]);
  }

  async createPlan(request: CreateMembershipPlanRequest): Promise<string | null> {
    this.detailSavingState.set(true);
    this.detailErrorState.set(null);

    try {
      const created = await firstValueFrom(
        this.api.post<MembershipPlanDetailDto>(MEMBERSHIPS_API.plans, request),
      );
      return created.id;
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to create membership plan.'));
      return null;
    } finally {
      this.detailSavingState.set(false);
    }
  }

  async updatePlan(planId: string, request: UpdateMembershipPlanRequest): Promise<boolean> {
    this.detailSavingState.set(true);
    this.detailErrorState.set(null);

    try {
      await firstValueFrom(this.api.put<void>(MEMBERSHIPS_API.plan(planId), request));
      await this.loadDetail(planId);
      return true;
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to update membership plan.'));
      return false;
    } finally {
      this.detailSavingState.set(false);
    }
  }

  async deletePlan(planId: string): Promise<boolean> {
    this.actionLoadingState.set(true);

    try {
      await firstValueFrom(this.api.delete<void>(MEMBERSHIPS_API.plan(planId)));
      await this.fetchPlans(true);
      return true;
    } catch (error) {
      this.plansErrorState.set(this.toErrorMessage(error, 'Failed to delete membership plan.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async duplicatePlan(planId: string, newName?: string, newSlug?: string): Promise<string | null> {
    this.actionLoadingState.set(true);
    this.plansErrorState.set(null);

    const body: DuplicateMembershipPlanRequest = {
      newName: newName ?? null,
      newSlug: newSlug ?? null,
    };

    try {
      const created = await firstValueFrom(
        this.api.post<MembershipPlanDetailDto>(MEMBERSHIPS_API.duplicate(planId), body),
      );
      await this.fetchPlans(true);
      return created.id;
    } catch (error) {
      this.plansErrorState.set(this.toErrorMessage(error, 'Failed to duplicate membership plan.'));
      return null;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async archivePlan(planId: string): Promise<boolean> {
    return this.runPlanAction(MEMBERSHIPS_API.archive(planId));
  }

  async activatePlan(planId: string): Promise<boolean> {
    return this.runPlanAction(MEMBERSHIPS_API.activate(planId));
  }

  async assignMembership(request: AssignMembershipRequest): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.membersErrorState.set(null);

    try {
      await firstValueFrom(this.api.post<void>(MEMBERSHIPS_API.assign, request));
      await this.fetchMembers();
      await this.fetchPlans(true);
      return true;
    } catch (error) {
      this.membersErrorState.set(this.toErrorMessage(error, 'Failed to assign membership.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async bulkAssignMembership(request: BulkAssignMembershipRequest): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.membersErrorState.set(null);

    try {
      await firstValueFrom(this.api.post<void>(MEMBERSHIPS_API.assignBulk, request));
      await this.fetchMembers();
      await this.fetchPlans(true);
      return true;
    } catch (error) {
      this.membersErrorState.set(this.toErrorMessage(error, 'Failed to bulk assign memberships.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async renewSubscription(subscriptionId: string): Promise<boolean> {
    return this.runSubscriptionAction(MEMBERSHIPS_API.renewSubscription(subscriptionId));
  }

  async upgradeSubscription(subscriptionId: string, targetPlanId: string): Promise<boolean> {
    const body: ChangeMembershipPlanRequest = { targetPlanId };
    return this.runSubscriptionAction(MEMBERSHIPS_API.upgradeSubscription(subscriptionId), body);
  }

  async downgradeSubscription(subscriptionId: string, targetPlanId: string): Promise<boolean> {
    const body: ChangeMembershipPlanRequest = { targetPlanId };
    return this.runSubscriptionAction(MEMBERSHIPS_API.downgradeSubscription(subscriptionId), body);
  }

  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    return this.runSubscriptionAction(MEMBERSHIPS_API.cancelSubscription(subscriptionId));
  }

  private async runPlanAction(endpoint: string): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.plansErrorState.set(null);

    try {
      await firstValueFrom(this.api.post<void>(endpoint, {}));
      await this.fetchPlans(true);
      return true;
    } catch (error) {
      this.plansErrorState.set(this.toErrorMessage(error, 'Failed to update plan status.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  private async runSubscriptionAction(endpoint: string, body: unknown = {}): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.membersErrorState.set(null);

    try {
      await firstValueFrom(this.api.post<void>(endpoint, body));
      await this.fetchMembers();
      return true;
    } catch (error) {
      this.membersErrorState.set(this.toErrorMessage(error, 'Failed to update subscription.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  private schedulePlansReload(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      void this.fetchPlans();
    }, SEARCH_DEBOUNCE_MS);
  }

  private scheduleMembersReload(): void {
    if (this.membersSearchDebounceTimer) {
      clearTimeout(this.membersSearchDebounceTimer);
    }

    this.membersSearchDebounceTimer = setTimeout(() => {
      void this.fetchMembers();
    }, SEARCH_DEBOUNCE_MS);
  }

  private async fetchPlans(force = false): Promise<void> {
    this.plansLoadingState.set(true);
    this.plansErrorState.set(null);

    const query: MembershipPlanListQuery = {
      pageNumber: this.pageNumberState(),
      pageSize: this.pageSizeState(),
      searchTerm: this.searchTermState(),
      status: this.statusFilterState(),
    };

    try {
      const result = await firstValueFrom(
        this.api.get<MembershipPlanListResult>(MEMBERSHIPS_API.plans, {
          params: {
            pageNumber: query.pageNumber,
            pageSize: query.pageSize,
            ...(query.searchTerm?.trim() ? { searchTerm: query.searchTerm.trim() } : {}),
            ...(query.status && query.status !== 'all' ? { status: query.status } : {}),
          },
        }),
      );

      this.plansState.set(result.items ?? []);
      this.totalCountState.set(result.totalCount ?? 0);
      this.pageNumberState.set(result.pageNumber ?? query.pageNumber);
      this.pageSizeState.set(result.pageSize ?? query.pageSize);
      this.hasLoadedPlansState.set(true);

      if (force) {
        void this.loadStatistics();
      }
    } catch (error) {
      this.plansState.set([]);
      this.totalCountState.set(0);
      this.plansErrorState.set(this.toErrorMessage(error, 'Failed to load membership plans.'));
    } finally {
      this.plansLoadingState.set(false);
    }
  }

  private async fetchMembers(): Promise<void> {
    this.membersLoadingState.set(true);
    this.membersErrorState.set(null);

    try {
      const result = await firstValueFrom(
        this.api.get<MemberListResult>(MEMBERSHIPS_API.members, {
          params: {
            pageNumber: this.membersPageState(),
            pageSize: this.membersPageSizeState(),
            ...(this.membersSearchState().trim()
              ? { searchTerm: this.membersSearchState().trim() }
              : {}),
          },
        }),
      );

      this.membersState.set(result.items ?? []);
      this.membersTotalState.set(result.totalCount ?? 0);
    } catch (error) {
      this.membersState.set([]);
      this.membersTotalState.set(0);
      this.membersErrorState.set(this.toErrorMessage(error, 'Failed to load members.'));
    } finally {
      this.membersLoadingState.set(false);
    }
  }

  private async fetchUserSearch(): Promise<void> {
    const term = this.userSearchTermState().trim();
    if (!term) {
      this.userSearchResultsState.set([]);
      return;
    }

    this.userSearchLoadingState.set(true);

    try {
      const result = await firstValueFrom(
        this.api.get<PagedResult<UserSearchResultApiDto>>(ROLES_API.userSearch, {
          params: { pageNumber: 1, pageSize: 10, searchTerm: term },
        }),
      );
      this.userSearchResultsState.set(result.items ?? []);
    } catch {
      this.userSearchResultsState.set([]);
    } finally {
      this.userSearchLoadingState.set(false);
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

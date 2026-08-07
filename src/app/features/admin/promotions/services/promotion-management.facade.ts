import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { PROMOTIONS_API } from '../../../../core/api/api-endpoints';
import { ApiClientService } from '../../../../core/api/api-client.service';
import { ApiError } from '../../../../core/models/api-error.model';
import {
  CreateCouponRequest,
  CreatePromotionRequest,
  DuplicatePromotionRequest,
  GenerateCouponsRequest,
  PromotionDetailDto,
  PromotionListItemDto,
  PromotionListQuery,
  PromotionListResult,
  PromotionRedemptionDto,
  PromotionRedemptionsResult,
  PromotionStatisticsDto,
  UpdatePromotionRequest,
} from '../models/promotion-api.model';

const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

@Injectable()
export class PromotionManagementFacade {
  private readonly api = inject(ApiClientService);

  private readonly promotionsState = signal<readonly PromotionListItemDto[]>([]);
  private readonly promotionsLoadingState = signal(false);
  private readonly promotionsErrorState = signal<string | null>(null);
  private readonly searchTermState = signal('');
  private readonly statusFilterState = signal('all');
  private readonly typeFilterState = signal('all');
  private readonly totalCountState = signal(0);
  private readonly pageNumberState = signal(1);
  private readonly pageSizeState = signal(DEFAULT_PAGE_SIZE);
  private readonly hasLoadedPromotionsState = signal(false);

  private readonly detailState = signal<PromotionDetailDto | null>(null);
  private readonly detailLoadingState = signal(false);
  private readonly detailSavingState = signal(false);
  private readonly detailErrorState = signal<string | null>(null);

  private readonly statisticsState = signal<PromotionStatisticsDto | null>(null);
  private readonly statisticsLoadingState = signal(false);
  private readonly statisticsErrorState = signal<string | null>(null);

  private readonly redemptionsState = signal<readonly PromotionRedemptionDto[]>([]);
  private readonly redemptionsLoadingState = signal(false);
  private readonly redemptionsErrorState = signal<string | null>(null);
  private readonly redemptionsTotalState = signal(0);
  private readonly redemptionsPageState = signal(1);
  private readonly redemptionsPageSizeState = signal(20);

  private readonly actionLoadingState = signal(false);

  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  readonly promotions = this.promotionsState.asReadonly();
  readonly promotionsLoading = this.promotionsLoadingState.asReadonly();
  readonly promotionsError = this.promotionsErrorState.asReadonly();
  readonly searchTerm = this.searchTermState.asReadonly();
  readonly statusFilter = this.statusFilterState.asReadonly();
  readonly typeFilter = this.typeFilterState.asReadonly();
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

  readonly redemptions = this.redemptionsState.asReadonly();
  readonly redemptionsLoading = this.redemptionsLoadingState.asReadonly();
  readonly redemptionsError = this.redemptionsErrorState.asReadonly();
  readonly redemptionsTotal = this.redemptionsTotalState.asReadonly();
  readonly redemptionsPage = this.redemptionsPageState.asReadonly();
  readonly redemptionsPageSize = this.redemptionsPageSizeState.asReadonly();

  readonly actionLoading = this.actionLoadingState.asReadonly();

  readonly hasActiveFilters = computed(
    () =>
      this.searchTermState().trim().length > 0 ||
      this.statusFilterState() !== 'all' ||
      this.typeFilterState() !== 'all',
  );

  readonly listStats = computed(() => {
    const items = this.promotionsState();
    return {
      total: this.totalCountState(),
      active: items.filter((item) => item.status === 'Active').length,
      redemptions: items.reduce((sum, item) => sum + item.totalRedemptions, 0),
      coupons: items.reduce((sum, item) => sum + item.couponCount, 0),
    };
  });

  loadPromotions(): void {
    void this.fetchPromotions(true);
  }

  reloadPromotions(): Promise<void> {
    return this.fetchPromotions(true);
  }

  setSearchTerm(term: string): void {
    this.searchTermState.set(term);
    this.pageNumberState.set(1);
    this.schedulePromotionsReload();
  }

  setStatusFilter(status: string): void {
    this.statusFilterState.set(status);
    this.pageNumberState.set(1);
    void this.fetchPromotions();
  }

  setTypeFilter(type: string): void {
    this.typeFilterState.set(type);
    this.pageNumberState.set(1);
    void this.fetchPromotions();
  }

  setPage(pageNumber: number, pageSize: number): void {
    if (
      this.pageNumberState() === pageNumber &&
      this.pageSizeState() === pageSize &&
      this.hasLoadedPromotionsState()
    ) {
      return;
    }

    this.pageNumberState.set(pageNumber);
    this.pageSizeState.set(pageSize);
    void this.fetchPromotions();
  }

  async loadDetail(promotionId: string): Promise<void> {
    this.detailLoadingState.set(true);
    this.detailErrorState.set(null);

    try {
      const detail = await firstValueFrom(
        this.api.get<PromotionDetailDto>(PROMOTIONS_API.promotion(promotionId)),
      );
      this.detailState.set(detail);
    } catch (error) {
      this.detailState.set(null);
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to load promotion.'));
    } finally {
      this.detailLoadingState.set(false);
    }
  }

  resetDetail(): void {
    this.detailState.set(null);
    this.detailErrorState.set(null);
    this.statisticsState.set(null);
    this.redemptionsState.set([]);
  }

  async loadStatistics(promotionId: string): Promise<void> {
    this.statisticsLoadingState.set(true);
    this.statisticsErrorState.set(null);

    try {
      const stats = await firstValueFrom(
        this.api.get<PromotionStatisticsDto>(PROMOTIONS_API.statistics(promotionId)),
      );
      this.statisticsState.set(stats);
    } catch (error) {
      this.statisticsState.set(null);
      this.statisticsErrorState.set(this.toErrorMessage(error, 'Failed to load statistics.'));
    } finally {
      this.statisticsLoadingState.set(false);
    }
  }

  loadRedemptions(promotionId: string): void {
    void this.fetchRedemptions(promotionId);
  }

  setRedemptionsPage(pageNumber: number, pageSize: number, promotionId: string): void {
    this.redemptionsPageState.set(pageNumber);
    this.redemptionsPageSizeState.set(pageSize);
    void this.fetchRedemptions(promotionId);
  }

  async createPromotion(request: CreatePromotionRequest): Promise<string | null> {
    this.detailSavingState.set(true);
    this.detailErrorState.set(null);

    try {
      return await firstValueFrom(this.api.post<string>(PROMOTIONS_API.promotions, request));
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to create promotion.'));
      return null;
    } finally {
      this.detailSavingState.set(false);
    }
  }

  async updatePromotion(promotionId: string, request: UpdatePromotionRequest): Promise<boolean> {
    this.detailSavingState.set(true);
    this.detailErrorState.set(null);

    try {
      await firstValueFrom(this.api.put<void>(PROMOTIONS_API.promotion(promotionId), request));
      await this.loadDetail(promotionId);
      return true;
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to update promotion.'));
      return false;
    } finally {
      this.detailSavingState.set(false);
    }
  }

  async deletePromotion(promotionId: string): Promise<boolean> {
    this.actionLoadingState.set(true);

    try {
      await firstValueFrom(this.api.delete<void>(PROMOTIONS_API.promotion(promotionId)));
      await this.fetchPromotions(true);
      return true;
    } catch (error) {
      this.promotionsErrorState.set(this.toErrorMessage(error, 'Failed to delete promotion.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async duplicatePromotion(promotionId: string, newName?: string): Promise<string | null> {
    this.actionLoadingState.set(true);
    this.promotionsErrorState.set(null);

    const body: DuplicatePromotionRequest = { newName: newName ?? null };

    try {
      const createdId = await firstValueFrom(
        this.api.post<string>(PROMOTIONS_API.duplicate(promotionId), body),
      );
      await this.fetchPromotions(true);
      return createdId;
    } catch (error) {
      this.promotionsErrorState.set(this.toErrorMessage(error, 'Failed to duplicate promotion.'));
      return null;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async publishPromotion(promotionId: string): Promise<boolean> {
    return this.runStatusAction(PROMOTIONS_API.publish(promotionId));
  }

  async activatePromotion(promotionId: string): Promise<boolean> {
    return this.runStatusAction(PROMOTIONS_API.activate(promotionId));
  }

  async deactivatePromotion(promotionId: string): Promise<boolean> {
    return this.runStatusAction(PROMOTIONS_API.deactivate(promotionId));
  }

  async archivePromotion(promotionId: string): Promise<boolean> {
    return this.runStatusAction(PROMOTIONS_API.archive(promotionId));
  }

  // HAMBOX's admin UI only ever creates one coupon per promotion (see promotion-edit-page /
  // promotion-detail-page) — `generateCoupons` has no UI call site today. Kept because the
  // backend endpoint (and multi-code capability) is intentionally still there for a future
  // bulk-campaign UI; removing this would silently drop that contract.
  async generateCoupons(promotionId: string, request: GenerateCouponsRequest): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.promotionsErrorState.set(null);

    try {
      await firstValueFrom(
        this.api.post<void>(PROMOTIONS_API.generateCoupons(promotionId), request),
      );
      await this.loadDetail(promotionId);
      return true;
    } catch (error) {
      this.promotionsErrorState.set(this.toErrorMessage(error, 'Failed to generate coupons.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async createCoupon(promotionId: string, request: CreateCouponRequest): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.promotionsErrorState.set(null);

    try {
      await firstValueFrom(this.api.post<void>(PROMOTIONS_API.coupons(promotionId), request));
      await this.loadDetail(promotionId);
      return true;
    } catch (error) {
      this.promotionsErrorState.set(this.toErrorMessage(error, 'Failed to create coupon.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  private async runStatusAction(endpoint: string): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.promotionsErrorState.set(null);

    try {
      await firstValueFrom(this.api.post<void>(endpoint, {}));
      await this.fetchPromotions(true);
      return true;
    } catch (error) {
      this.promotionsErrorState.set(this.toErrorMessage(error, 'Failed to update promotion status.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  private schedulePromotionsReload(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      void this.fetchPromotions();
    }, SEARCH_DEBOUNCE_MS);
  }

  private async fetchPromotions(force = false): Promise<void> {
    this.promotionsLoadingState.set(true);
    this.promotionsErrorState.set(null);

    const query: PromotionListQuery = {
      pageNumber: this.pageNumberState(),
      pageSize: this.pageSizeState(),
      searchTerm: this.searchTermState(),
      status: this.statusFilterState(),
      type: this.typeFilterState(),
    };

    try {
      const result = await firstValueFrom(
        this.api.get<PromotionListResult>(PROMOTIONS_API.promotions, {
          params: {
            pageNumber: query.pageNumber,
            pageSize: query.pageSize,
            ...(query.searchTerm?.trim() ? { searchTerm: query.searchTerm.trim() } : {}),
            ...(query.status && query.status !== 'all' ? { status: query.status } : {}),
            ...(query.type && query.type !== 'all' ? { type: query.type } : {}),
          },
        }),
      );

      this.promotionsState.set(result.items ?? []);
      this.totalCountState.set(result.totalCount ?? 0);
      this.pageNumberState.set(result.pageNumber ?? query.pageNumber);
      this.pageSizeState.set(result.pageSize ?? query.pageSize);
      this.hasLoadedPromotionsState.set(true);
    } catch (error) {
      this.promotionsState.set([]);
      this.totalCountState.set(0);
      this.promotionsErrorState.set(this.toErrorMessage(error, 'Failed to load promotions.'));
    } finally {
      this.promotionsLoadingState.set(false);
    }
  }

  private async fetchRedemptions(promotionId: string): Promise<void> {
    this.redemptionsLoadingState.set(true);
    this.redemptionsErrorState.set(null);

    try {
      const result = await firstValueFrom(
        this.api.get<PromotionRedemptionsResult>(PROMOTIONS_API.redemptions(promotionId), {
          params: {
            pageNumber: this.redemptionsPageState(),
            pageSize: this.redemptionsPageSizeState(),
          },
        }),
      );

      this.redemptionsState.set(result.items ?? []);
      this.redemptionsTotalState.set(result.totalCount ?? 0);
    } catch (error) {
      this.redemptionsState.set([]);
      this.redemptionsTotalState.set(0);
      this.redemptionsErrorState.set(this.toErrorMessage(error, 'Failed to load redemptions.'));
    } finally {
      this.redemptionsLoadingState.set(false);
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

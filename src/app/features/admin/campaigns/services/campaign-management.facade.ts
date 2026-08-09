import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CAMPAIGNS_API } from '../../../../core/api/api-endpoints';
import { ApiClientService } from '../../../../core/api/api-client.service';
import { ApiError } from '../../../../core/models/api-error.model';
import {
  CampaignDetailDto,
  CampaignHistoryEntryDto,
  CampaignListItemDto,
  CampaignListQuery,
  CampaignListResult,
  CreateCampaignRequest,
  UpdateCampaignRequest,
} from '../models/campaign-api.model';

const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

@Injectable()
export class CampaignManagementFacade {
  private readonly api = inject(ApiClientService);

  private readonly campaignsState = signal<readonly CampaignListItemDto[]>([]);
  private readonly campaignsLoadingState = signal(false);
  private readonly campaignsErrorState = signal<string | null>(null);
  private readonly searchTermState = signal('');
  private readonly statusFilterState = signal('all');
  private readonly totalCountState = signal(0);
  private readonly pageNumberState = signal(1);
  private readonly pageSizeState = signal(DEFAULT_PAGE_SIZE);

  private readonly detailState = signal<CampaignDetailDto | null>(null);
  private readonly detailLoadingState = signal(false);
  private readonly detailSavingState = signal(false);
  private readonly detailErrorState = signal<string | null>(null);

  private readonly historyState = signal<readonly CampaignHistoryEntryDto[]>([]);
  private readonly historyLoadingState = signal(false);

  private readonly actionLoadingState = signal(false);

  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  readonly campaigns = this.campaignsState.asReadonly();
  readonly campaignsLoading = this.campaignsLoadingState.asReadonly();
  readonly campaignsError = this.campaignsErrorState.asReadonly();
  readonly searchTerm = this.searchTermState.asReadonly();
  readonly statusFilter = this.statusFilterState.asReadonly();
  readonly totalCount = this.totalCountState.asReadonly();
  readonly pageNumber = this.pageNumberState.asReadonly();
  readonly pageSize = this.pageSizeState.asReadonly();

  readonly detail = this.detailState.asReadonly();
  readonly detailLoading = this.detailLoadingState.asReadonly();
  readonly detailSaving = this.detailSavingState.asReadonly();
  readonly detailError = this.detailErrorState.asReadonly();

  readonly history = this.historyState.asReadonly();
  readonly historyLoading = this.historyLoadingState.asReadonly();

  readonly actionLoading = this.actionLoadingState.asReadonly();

  loadCampaigns(): void {
    void this.fetchCampaigns();
  }

  reloadCampaigns(): Promise<void> {
    return this.fetchCampaigns();
  }

  setSearchTerm(term: string): void {
    this.searchTermState.set(term);
    this.pageNumberState.set(1);
    this.scheduleReload();
  }

  setStatusFilter(status: string): void {
    this.statusFilterState.set(status);
    this.pageNumberState.set(1);
    void this.fetchCampaigns();
  }

  setPage(pageNumber: number, pageSize: number): void {
    this.pageNumberState.set(pageNumber);
    this.pageSizeState.set(pageSize);
    void this.fetchCampaigns();
  }

  async loadDetail(id: string): Promise<void> {
    this.detailLoadingState.set(true);
    this.detailErrorState.set(null);

    try {
      const detail = await firstValueFrom(this.api.get<CampaignDetailDto>(CAMPAIGNS_API.campaign(id)));
      this.detailState.set(detail);
    } catch (error) {
      this.detailState.set(null);
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to load campaign.'));
    } finally {
      this.detailLoadingState.set(false);
    }
  }

  resetDetail(): void {
    this.detailState.set(null);
    this.detailErrorState.set(null);
    this.historyState.set([]);
  }

  async loadHistory(id: string): Promise<void> {
    this.historyLoadingState.set(true);

    try {
      const history = await firstValueFrom(this.api.get<CampaignHistoryEntryDto[]>(CAMPAIGNS_API.history(id)));
      this.historyState.set(history ?? []);
    } catch {
      this.historyState.set([]);
    } finally {
      this.historyLoadingState.set(false);
    }
  }

  async createCampaign(request: CreateCampaignRequest): Promise<string | null> {
    this.detailSavingState.set(true);
    this.detailErrorState.set(null);

    try {
      return await firstValueFrom(this.api.post<string>(CAMPAIGNS_API.campaigns, request));
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to create campaign.'));
      return null;
    } finally {
      this.detailSavingState.set(false);
    }
  }

  async updateCampaign(id: string, request: UpdateCampaignRequest): Promise<boolean> {
    this.detailSavingState.set(true);
    this.detailErrorState.set(null);

    try {
      await firstValueFrom(this.api.put<void>(CAMPAIGNS_API.campaign(id), request));
      await this.loadDetail(id);
      return true;
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to update campaign.'));
      return false;
    } finally {
      this.detailSavingState.set(false);
    }
  }

  async publishCampaign(id: string): Promise<boolean> {
    return this.runAction(async () => {
      await firstValueFrom(this.api.post<void>(CAMPAIGNS_API.publish(id), {}));
      await this.loadDetail(id);
    });
  }

  async enableCampaign(id: string): Promise<boolean> {
    return this.runAction(async () => {
      await firstValueFrom(this.api.post<void>(CAMPAIGNS_API.enable(id), {}));
    });
  }

  async disableCampaign(id: string): Promise<boolean> {
    return this.runAction(async () => {
      await firstValueFrom(this.api.post<void>(CAMPAIGNS_API.disable(id), {}));
    });
  }

  async archiveCampaign(id: string): Promise<boolean> {
    return this.runAction(async () => {
      await firstValueFrom(this.api.post<void>(CAMPAIGNS_API.archive(id), {}));
    });
  }

  async deleteCampaign(id: string): Promise<boolean> {
    this.actionLoadingState.set(true);

    try {
      await firstValueFrom(this.api.delete<void>(CAMPAIGNS_API.campaign(id)));
      await this.fetchCampaigns();
      return true;
    } catch (error) {
      this.campaignsErrorState.set(this.toErrorMessage(error, 'Failed to delete campaign.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  private async runAction(action: () => Promise<void>): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.campaignsErrorState.set(null);

    try {
      await action();
      await this.fetchCampaigns();
      return true;
    } catch (error) {
      this.campaignsErrorState.set(this.toErrorMessage(error, 'Action failed.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  private scheduleReload(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      void this.fetchCampaigns();
    }, SEARCH_DEBOUNCE_MS);
  }

  private async fetchCampaigns(): Promise<void> {
    this.campaignsLoadingState.set(true);
    this.campaignsErrorState.set(null);

    const query: CampaignListQuery = {
      pageNumber: this.pageNumberState(),
      pageSize: this.pageSizeState(),
      searchTerm: this.searchTermState(),
      status: this.statusFilterState(),
    };

    try {
      const result = await firstValueFrom(
        this.api.get<CampaignListResult>(CAMPAIGNS_API.campaigns, {
          params: {
            pageNumber: query.pageNumber,
            pageSize: query.pageSize,
            ...(query.searchTerm?.trim() ? { searchTerm: query.searchTerm.trim() } : {}),
            ...(query.status && query.status !== 'all' ? { status: query.status } : {}),
          },
        }),
      );

      this.campaignsState.set(result.items ?? []);
      this.totalCountState.set(result.totalCount ?? 0);
    } catch (error) {
      this.campaignsState.set([]);
      this.totalCountState.set(0);
      this.campaignsErrorState.set(this.toErrorMessage(error, 'Failed to load campaigns.'));
    } finally {
      this.campaignsLoadingState.set(false);
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

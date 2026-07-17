import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiClientService } from '../../../../core/api/api-client.service';
import { COMMUNICATION_API } from '../../../../core/api/api-endpoints';
import { ApiError } from '../../../../core/models/api-error.model';
import {
  CommunicationDashboardStatsDto,
  CommunicationMessageListItemDto,
  CommunicationProviderConfigDto,
  CommunicationTemplateDetailDto,
  CommunicationTemplateListItemDto,
  CreateCommunicationTemplateRequest,
  PagedResult,
  UpdateCommunicationTemplateRequest,
} from '../models/communication.model';

@Injectable()
export class CommunicationFacade {
  private readonly api = inject(ApiClientService);

  private readonly statsState = signal<CommunicationDashboardStatsDto | null>(null);
  private readonly statsLoadingState = signal(false);
  private readonly statsErrorState = signal<string | null>(null);

  private readonly templatesState = signal<readonly CommunicationTemplateListItemDto[]>([]);
  private readonly templatesLoadingState = signal(false);
  private readonly templatesErrorState = signal<string | null>(null);

  private readonly templateDetailState = signal<CommunicationTemplateDetailDto | null>(null);
  private readonly templateSavingState = signal(false);
  private readonly templateErrorState = signal<string | null>(null);

  private readonly messagesState = signal<PagedResult<CommunicationMessageListItemDto> | null>(null);
  private readonly messagesLoadingState = signal(false);
  private readonly messagesErrorState = signal<string | null>(null);

  private readonly failedState = signal<PagedResult<CommunicationMessageListItemDto> | null>(null);
  private readonly failedLoadingState = signal(false);
  private readonly failedErrorState = signal<string | null>(null);

  private readonly providersState = signal<readonly CommunicationProviderConfigDto[]>([]);
  private readonly providersLoadingState = signal(false);
  private readonly providersErrorState = signal<string | null>(null);

  private readonly actionLoadingState = signal(false);

  readonly stats = this.statsState.asReadonly();
  readonly statsLoading = this.statsLoadingState.asReadonly();
  readonly statsError = this.statsErrorState.asReadonly();

  readonly templates = this.templatesState.asReadonly();
  readonly templatesLoading = this.templatesLoadingState.asReadonly();
  readonly templatesError = this.templatesErrorState.asReadonly();

  readonly templateDetail = this.templateDetailState.asReadonly();
  readonly templateSaving = this.templateSavingState.asReadonly();
  readonly templateError = this.templateErrorState.asReadonly();

  readonly messages = this.messagesState.asReadonly();
  readonly messagesLoading = this.messagesLoadingState.asReadonly();
  readonly messagesError = this.messagesErrorState.asReadonly();

  readonly failedDeliveries = this.failedState.asReadonly();
  readonly failedLoading = this.failedLoadingState.asReadonly();
  readonly failedError = this.failedErrorState.asReadonly();

  readonly providers = this.providersState.asReadonly();
  readonly providersLoading = this.providersLoadingState.asReadonly();
  readonly providersError = this.providersErrorState.asReadonly();

  readonly actionLoading = this.actionLoadingState.asReadonly();

  async loadDashboardStats(): Promise<void> {
    this.statsLoadingState.set(true);
    this.statsErrorState.set(null);

    try {
      const stats = await firstValueFrom(this.api.get<CommunicationDashboardStatsDto>(COMMUNICATION_API.dashboardStats));
      this.statsState.set(stats);
    } catch (error) {
      this.statsState.set(null);
      this.statsErrorState.set(this.toErrorMessage(error, 'Failed to load dashboard statistics.'));
    } finally {
      this.statsLoadingState.set(false);
    }
  }

  async loadTemplates(): Promise<void> {
    this.templatesLoadingState.set(true);
    this.templatesErrorState.set(null);

    try {
      const templates = await firstValueFrom(
        this.api.get<readonly CommunicationTemplateListItemDto[]>(COMMUNICATION_API.templates),
      );
      this.templatesState.set(templates ?? []);
    } catch (error) {
      this.templatesState.set([]);
      this.templatesErrorState.set(this.toErrorMessage(error, 'Failed to load templates.'));
    } finally {
      this.templatesLoadingState.set(false);
    }
  }

  async loadTemplateDetail(id: string): Promise<void> {
    this.templateErrorState.set(null);

    try {
      const detail = await firstValueFrom(this.api.get<CommunicationTemplateDetailDto>(COMMUNICATION_API.template(id)));
      this.templateDetailState.set(detail);
    } catch (error) {
      this.templateDetailState.set(null);
      this.templateErrorState.set(this.toErrorMessage(error, 'Failed to load template.'));
    }
  }

  clearTemplateDetail(): void {
    this.templateDetailState.set(null);
    this.templateErrorState.set(null);
  }

  async createTemplate(request: CreateCommunicationTemplateRequest): Promise<string | null> {
    this.templateSavingState.set(true);
    this.templateErrorState.set(null);

    try {
      const id = await firstValueFrom(this.api.post<string>(COMMUNICATION_API.templates, request));
      await this.loadTemplates();
      return id;
    } catch (error) {
      this.templateErrorState.set(this.toErrorMessage(error, 'Failed to create template.'));
      return null;
    } finally {
      this.templateSavingState.set(false);
    }
  }

  async updateTemplate(id: string, request: UpdateCommunicationTemplateRequest): Promise<boolean> {
    this.templateSavingState.set(true);
    this.templateErrorState.set(null);

    try {
      await firstValueFrom(this.api.put<void>(COMMUNICATION_API.template(id), request));
      await this.loadTemplateDetail(id);
      await this.loadTemplates();
      return true;
    } catch (error) {
      this.templateErrorState.set(this.toErrorMessage(error, 'Failed to save template.'));
      return false;
    } finally {
      this.templateSavingState.set(false);
    }
  }

  async publishTemplate(id: string, versionId: string | null): Promise<boolean> {
    this.templateSavingState.set(true);
    this.templateErrorState.set(null);

    try {
      await firstValueFrom(this.api.post<void>(COMMUNICATION_API.publishTemplate(id), versionId));
      await this.loadTemplateDetail(id);
      await this.loadTemplates();
      return true;
    } catch (error) {
      this.templateErrorState.set(this.toErrorMessage(error, 'Failed to publish template.'));
      return false;
    } finally {
      this.templateSavingState.set(false);
    }
  }

  async loadMessages(
    pageNumber: number,
    pageSize: number,
    status?: string,
    channel?: string,
    category?: string,
    search?: string,
  ): Promise<void> {
    this.messagesLoadingState.set(true);
    this.messagesErrorState.set(null);

    try {
      const params: Record<string, string | number> = { pageNumber, pageSize };
      if (status && status !== 'all') {
        params['status'] = status;
      }
      if (channel && channel !== 'all') {
        params['channel'] = channel;
      }
      if (category && category !== 'all') {
        params['category'] = category;
      }
      if (search) {
        params['search'] = search;
      }

      const result = await firstValueFrom(
        this.api.get<PagedResult<CommunicationMessageListItemDto>>(COMMUNICATION_API.messages, { params }),
      );
      this.messagesState.set(result);
    } catch (error) {
      this.messagesState.set(null);
      this.messagesErrorState.set(this.toErrorMessage(error, 'Failed to load notifications.'));
    } finally {
      this.messagesLoadingState.set(false);
    }
  }

  async loadFailedDeliveries(pageNumber: number, pageSize: number): Promise<void> {
    this.failedLoadingState.set(true);
    this.failedErrorState.set(null);

    try {
      const result = await firstValueFrom(
        this.api.get<PagedResult<CommunicationMessageListItemDto>>(COMMUNICATION_API.failedDeliveries, {
          params: { pageNumber, pageSize },
        }),
      );
      this.failedState.set(result);
    } catch (error) {
      this.failedState.set(null);
      this.failedErrorState.set(this.toErrorMessage(error, 'Failed to load failed deliveries.'));
    } finally {
      this.failedLoadingState.set(false);
    }
  }

  async retryDelivery(id: string): Promise<boolean> {
    this.actionLoadingState.set(true);

    try {
      await firstValueFrom(this.api.post<void>(COMMUNICATION_API.retryDelivery(id)));
      return true;
    } catch (error) {
      this.failedErrorState.set(this.toErrorMessage(error, 'Failed to retry delivery.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async loadProviders(): Promise<void> {
    this.providersLoadingState.set(true);
    this.providersErrorState.set(null);

    try {
      const providers = await firstValueFrom(
        this.api.get<readonly CommunicationProviderConfigDto[]>(COMMUNICATION_API.providers),
      );
      this.providersState.set(providers ?? []);
    } catch (error) {
      this.providersState.set([]);
      this.providersErrorState.set(this.toErrorMessage(error, 'Failed to load providers.'));
    } finally {
      this.providersLoadingState.set(false);
    }
  }

  async updateProvider(id: string, isEnabled: boolean, priority: number): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.providersErrorState.set(null);

    try {
      await firstValueFrom(this.api.put<void>(COMMUNICATION_API.provider(id), { isEnabled, priority }));
      await this.loadProviders();
      return true;
    } catch (error) {
      this.providersErrorState.set(this.toErrorMessage(error, 'Failed to update provider.'));
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

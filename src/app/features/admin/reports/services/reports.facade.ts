import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { REPORTS_API } from '../../../../core/api/api-endpoints';
import { ApiClientService } from '../../../../core/api/api-client.service';
import { ApiError } from '../../../../core/models/api-error.model';
import { API_BASE_URL } from '../../../../core/tokens/api-base-url.token';
import {
  CreateReportDefinitionRequest,
  CreateScheduledReportRequest,
  DEFAULT_REPORT_FILTERS,
  ReportDefinition,
  ReportDownload,
  ReportFilterState,
  ReportFormat,
  ReportTypeInfo,
  ScheduledReport,
  ScheduledReportExecution,
  UpdateScheduledReportRequest,
} from '../models/reports-api.model';
import {
  downloadBlob,
  filenameFromContentDisposition,
} from '../utils/reports-download.util';

@Injectable()
export class ReportsFacade {
  private readonly api = inject(ApiClientService);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  private readonly filtersState = signal<ReportFilterState>({ ...DEFAULT_REPORT_FILTERS });
  private readonly loadingState = signal(false);
  private readonly generatingState = signal(false);
  private readonly actionLoadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  private readonly typesState = signal<ReportTypeInfo[]>([]);
  private readonly libraryState = signal<ReportDefinition[]>([]);
  private readonly favoritesState = signal<ReportDefinition[]>([]);
  private readonly downloadsState = signal<ReportDownload[]>([]);
  private readonly schedulesState = signal<ScheduledReport[]>([]);
  private readonly executionsState = signal<ScheduledReportExecution[]>([]);

  readonly filters = this.filtersState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly generating = this.generatingState.asReadonly();
  readonly actionLoading = this.actionLoadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  readonly types = this.typesState.asReadonly();
  readonly library = this.libraryState.asReadonly();
  readonly favorites = this.favoritesState.asReadonly();
  readonly downloads = this.downloadsState.asReadonly();
  readonly schedules = this.schedulesState.asReadonly();
  readonly executions = this.executionsState.asReadonly();

  setFilters(patch: Partial<ReportFilterState>): void {
    this.filtersState.update((current) => ({ ...current, ...patch }));
  }

  filtersJson(): string {
    const filters = this.filtersState();
    return JSON.stringify({
      preset: filters.preset,
      from: filters.preset === 'Custom' ? filters.from : null,
      to: filters.preset === 'Custom' ? filters.to : null,
    });
  }

  async loadTypes(): Promise<void> {
    await this.run(async () => {
      this.typesState.set(
        await firstValueFrom(this.api.get<ReportTypeInfo[]>(REPORTS_API.types)),
      );
    }, 'Unable to load report types.');
  }

  async loadLibrary(search?: string): Promise<void> {
    await this.run(async () => {
      const params: Record<string, string | number | boolean> = {};
      if (search?.trim()) {
        params['search'] = search.trim();
      }
      this.libraryState.set(
        await firstValueFrom(
          this.api.get<ReportDefinition[]>(REPORTS_API.library, { params }),
        ),
      );
    }, 'Unable to load report library.');
  }

  async loadFavorites(): Promise<void> {
    await this.run(async () => {
      this.favoritesState.set(
        await firstValueFrom(this.api.get<ReportDefinition[]>(REPORTS_API.favorites)),
      );
    }, 'Unable to load favorite reports.');
  }

  async loadDownloads(): Promise<void> {
    await this.run(async () => {
      this.downloadsState.set(
        await firstValueFrom(this.api.get<ReportDownload[]>(REPORTS_API.downloads)),
      );
    }, 'Unable to load report downloads.');
  }

  async loadSchedules(): Promise<void> {
    await this.run(async () => {
      this.schedulesState.set(
        await firstValueFrom(this.api.get<ScheduledReport[]>(REPORTS_API.schedules)),
      );
    }, 'Unable to load scheduled reports.');
  }

  async loadExecutions(scheduleId: string): Promise<void> {
    await this.run(async () => {
      this.executionsState.set(
        await firstValueFrom(
          this.api.get<ScheduledReportExecution[]>(
            REPORTS_API.scheduleExecutions(scheduleId),
          ),
        ),
      );
    }, 'Unable to load schedule executions.');
  }

  async generateReport(type: string, format: ReportFormat): Promise<boolean> {
    this.generatingState.set(true);
    this.errorState.set(null);
    try {
      const filters = this.filtersState();
      const body: Record<string, unknown> = {
        reportType: type,
        format,
        preset: filters.preset,
      };
      if (filters.preset === 'Custom' && filters.from) {
        body['from'] = filters.from;
      }
      if (filters.preset === 'Custom' && filters.to) {
        body['to'] = filters.to;
      }

      const response = await firstValueFrom(
        this.http.post(`${this.resolveUrl(REPORTS_API.generate)}`, body, {
          responseType: 'blob',
          observe: 'response',
        }),
      );

      const fallback = `report-${type}.${this.extensionFor(format)}`;
      const filename = filenameFromContentDisposition(
        response.headers.get('content-disposition'),
        fallback,
      );
      downloadBlob(this.unwrapBlob(response), filename);
      void this.loadDownloads();
      return true;
    } catch (error) {
      this.errorState.set(this.resolveError(error, 'Unable to generate report.'));
      return false;
    } finally {
      this.generatingState.set(false);
    }
  }

  async createDefinition(request: CreateReportDefinitionRequest): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.errorState.set(null);
    try {
      await firstValueFrom(
        this.api.post(REPORTS_API.definitions, {
          name: request.name,
          reportType: request.reportType,
          filtersJson: request.filtersJson ?? this.filtersJson(),
          formatDefault: request.formatDefault ?? 'pdf',
        }),
      );
      await this.loadLibrary();
      return true;
    } catch (error) {
      this.errorState.set(this.resolveError(error, 'Unable to save report definition.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async deleteDefinition(id: string): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.errorState.set(null);
    try {
      await firstValueFrom(this.api.delete(REPORTS_API.definition(id)));
      await this.loadLibrary();
      await this.loadFavorites();
      return true;
    } catch (error) {
      this.errorState.set(this.resolveError(error, 'Unable to delete report definition.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async addFavorite(definitionId: string): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.errorState.set(null);
    try {
      await firstValueFrom(this.api.post(REPORTS_API.favorite(definitionId), {}));
      await this.loadFavorites();
      await this.loadLibrary();
      return true;
    } catch (error) {
      this.errorState.set(this.resolveError(error, 'Unable to favorite report.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async removeFavorite(definitionId: string): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.errorState.set(null);
    try {
      await firstValueFrom(this.api.delete(REPORTS_API.favorite(definitionId)));
      await this.loadFavorites();
      await this.loadLibrary();
      return true;
    } catch (error) {
      this.errorState.set(this.resolveError(error, 'Unable to remove favorite.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async createSchedule(request: CreateScheduledReportRequest): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.errorState.set(null);
    try {
      await firstValueFrom(
        this.api.post(REPORTS_API.schedules, {
          reportType: request.reportType,
          filtersJson: request.filtersJson ?? this.filtersJson(),
          format: request.format ?? 'pdf',
          frequency: request.frequency ?? 'Daily',
          emailRecipients: request.emailRecipients ?? [],
          isEnabled: request.isEnabled,
          reportDefinitionId: request.reportDefinitionId ?? null,
        }),
      );
      await this.loadSchedules();
      return true;
    } catch (error) {
      this.errorState.set(this.resolveError(error, 'Unable to create schedule.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async updateSchedule(
    id: string,
    request: UpdateScheduledReportRequest,
  ): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.errorState.set(null);
    try {
      await firstValueFrom(
        this.api.put(REPORTS_API.schedule(id), {
          filtersJson: request.filtersJson ?? null,
          format: request.format ?? 'pdf',
          frequency: request.frequency ?? 'Daily',
          emailRecipients: request.emailRecipients ?? [],
          isEnabled: request.isEnabled,
        }),
      );
      await this.loadSchedules();
      return true;
    } catch (error) {
      this.errorState.set(this.resolveError(error, 'Unable to update schedule.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async deleteSchedule(id: string): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.errorState.set(null);
    try {
      await firstValueFrom(this.api.delete(REPORTS_API.schedule(id)));
      this.executionsState.set([]);
      await this.loadSchedules();
      return true;
    } catch (error) {
      this.errorState.set(this.resolveError(error, 'Unable to delete schedule.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async runSchedule(id: string): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.errorState.set(null);
    try {
      await firstValueFrom(this.api.post(REPORTS_API.runSchedule(id), {}));
      await this.loadSchedules();
      await this.loadExecutions(id);
      return true;
    } catch (error) {
      this.errorState.set(this.resolveError(error, 'Unable to run schedule.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  private extensionFor(format: ReportFormat): string {
    switch (format) {
      case 'xlsx':
        return 'xlsx';
      case 'json':
        return 'json';
      case 'pdf':
        return 'pdf';
      default:
        return 'csv';
    }
  }

  private unwrapBlob(response: HttpResponse<Blob>): Blob {
    return response.body ?? new Blob();
  }

  private resolveUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const base = this.apiBaseUrl.replace(/\/$/, '');
    return `${base}${normalizedPath}`;
  }

  private async run(action: () => Promise<void>, fallback: string): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      await action();
    } catch (error) {
      this.errorState.set(this.resolveError(error, fallback));
    } finally {
      this.loadingState.set(false);
    }
  }

  private resolveError(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    return fallback;
  }
}
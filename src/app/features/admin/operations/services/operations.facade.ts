import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { OPERATIONS_API } from '../../../../core/api/api-endpoints';
import { ApiClientService } from '../../../../core/api/api-client.service';
import { ApiError } from '../../../../core/models/api-error.model';
import {
  ApiRequestLogDto,
  BackgroundJobExecutionHistoryDto,
  DeliveryMonitorItemDto,
  OperationalAlertDto,
  OperationalJobDto,
  OperationsDashboardDto,
  PagedResult,
  RecurringJobDefinitionDto,
  SupplierOperationsItemDto,
  SystemHealthDto,
} from '../models/operations-api.model';

type QueryParams = Record<string, string | number | boolean | undefined>;

@Injectable()
export class OperationsFacade {
  private readonly api = inject(ApiClientService);

  private readonly dashboardState = signal<OperationsDashboardDto | null>(null);
  private readonly jobsState = signal<PagedResult<OperationalJobDto> | null>(null);
  private readonly jobHistoryState = signal<BackgroundJobExecutionHistoryDto[]>([]);
  private readonly recurringJobsState = signal<RecurringJobDefinitionDto[]>([]);
  private readonly deliveryState = signal<PagedResult<DeliveryMonitorItemDto> | null>(null);
  private readonly suppliersState = signal<SupplierOperationsItemDto[]>([]);
  private readonly apiLogsState = signal<PagedResult<ApiRequestLogDto> | null>(null);
  private readonly healthState = signal<SystemHealthDto | null>(null);
  private readonly alertsState = signal<PagedResult<OperationalAlertDto> | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly dashboard = this.dashboardState.asReadonly();
  readonly jobs = this.jobsState.asReadonly();
  readonly jobHistory = this.jobHistoryState.asReadonly();
  readonly recurringJobs = this.recurringJobsState.asReadonly();
  readonly delivery = this.deliveryState.asReadonly();
  readonly suppliers = this.suppliersState.asReadonly();
  readonly apiLogs = this.apiLogsState.asReadonly();
  readonly health = this.healthState.asReadonly();
  readonly alerts = this.alertsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  async loadDashboard(): Promise<void> {
    await this.run(async () => {
      this.dashboardState.set(
        await firstValueFrom(this.api.get<OperationsDashboardDto>(OPERATIONS_API.dashboard)),
      );
    }, 'Unable to load operations dashboard.');
  }

  async loadJobs(params: QueryParams): Promise<void> {
    await this.run(async () => {
      this.jobsState.set(
        await firstValueFrom(
          this.api.get<PagedResult<OperationalJobDto>>(OPERATIONS_API.jobs, {
            params: this.clean(params),
          }),
        ),
      );
    }, 'Unable to load operational jobs.');
  }

  async loadJobHistory(id: string): Promise<void> {
    await this.run(async () => {
      this.jobHistoryState.set(
        await firstValueFrom(
          this.api.get<BackgroundJobExecutionHistoryDto[]>(OPERATIONS_API.jobHistory(id)),
        ),
      );
    }, 'Unable to load job execution history.');
  }

  async loadRecurringJobs(): Promise<void> {
    await this.run(async () => {
      this.recurringJobsState.set(
        await firstValueFrom(this.api.get<RecurringJobDefinitionDto[]>(OPERATIONS_API.recurringJobs)),
      );
    }, 'Unable to load recurring jobs.');
  }

  async retryJob(id: string): Promise<boolean> {
    try {
      await firstValueFrom(this.api.post(OPERATIONS_API.retryJob(id), {}));
      return true;
    } catch (error) {
      this.errorState.set(this.resolveError(error, 'Unable to retry job.'));
      return false;
    }
  }

  async retryAllFailed(): Promise<number | null> {
    try {
      return await firstValueFrom(this.api.post<number>(OPERATIONS_API.retryAllJobs, {}));
    } catch (error) {
      this.errorState.set(this.resolveError(error, 'Unable to retry failed jobs.'));
      return null;
    }
  }

  async cancelJob(id: string): Promise<boolean> {
    try {
      await firstValueFrom(this.api.post(OPERATIONS_API.cancelJob(id), {}));
      return true;
    } catch (error) {
      this.errorState.set(this.resolveError(error, 'Unable to cancel job.'));
      return false;
    }
  }

  async clearCompleted(): Promise<number | null> {
    try {
      return await firstValueFrom(this.api.post<number>(OPERATIONS_API.clearCompleted, {}));
    } catch (error) {
      this.errorState.set(this.resolveError(error, 'Unable to clear completed jobs.'));
      return null;
    }
  }

  async loadDelivery(params: QueryParams): Promise<void> {
    await this.run(async () => {
      this.deliveryState.set(
        await firstValueFrom(
          this.api.get<PagedResult<DeliveryMonitorItemDto>>(OPERATIONS_API.delivery, {
            params: this.clean(params),
          }),
        ),
      );
    }, 'Unable to load delivery monitor.');
  }

  async retryDelivery(orderId: string): Promise<boolean> {
    try {
      await firstValueFrom(this.api.post(OPERATIONS_API.retryDelivery(orderId), {}));
      return true;
    } catch (error) {
      this.errorState.set(this.resolveError(error, 'Unable to enqueue delivery retry.'));
      return false;
    }
  }

  async loadSuppliers(): Promise<void> {
    await this.run(async () => {
      this.suppliersState.set(
        await firstValueFrom(this.api.get<SupplierOperationsItemDto[]>(OPERATIONS_API.suppliers)),
      );
    }, 'Unable to load suppliers.');
  }

  async loadApiLogs(params: QueryParams): Promise<void> {
    await this.run(async () => {
      this.apiLogsState.set(
        await firstValueFrom(
          this.api.get<PagedResult<ApiRequestLogDto>>(OPERATIONS_API.apiLogs, {
            params: this.clean(params),
          }),
        ),
      );
    }, 'Unable to load API request logs.');
  }

  async loadHealth(): Promise<void> {
    await this.run(async () => {
      this.healthState.set(
        await firstValueFrom(this.api.get<SystemHealthDto>(OPERATIONS_API.health)),
      );
    }, 'Unable to load system health.');
  }

  async loadAlerts(params: QueryParams): Promise<void> {
    await this.run(async () => {
      this.alertsState.set(
        await firstValueFrom(
          this.api.get<PagedResult<OperationalAlertDto>>(OPERATIONS_API.alerts, {
            params: this.clean(params),
          }),
        ),
      );
    }, 'Unable to load alerts.');
  }

  async acknowledgeAlert(id: string): Promise<boolean> {
    try {
      await firstValueFrom(this.api.post(OPERATIONS_API.acknowledgeAlert(id), {}));
      return true;
    } catch (error) {
      this.errorState.set(this.resolveError(error, 'Unable to acknowledge alert.'));
      return false;
    }
  }

  private clean(params: QueryParams): Record<string, string | number | boolean> {
    const result: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        result[key] = value;
      }
    }
    return result;
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

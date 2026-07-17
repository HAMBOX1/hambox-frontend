import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { TableModule } from 'primeng/table';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { OperationalJobDto } from '../../models/operations-api.model';
import { OperationsFacade } from '../../services/operations.facade';

@Component({
  selector: 'app-operations-failed-jobs-page',
  standalone: true,
  imports: [
    DatePipe,
    TranslatePipe,
    ButtonModule,
    DrawerModule,
    TableModule,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminSectionCardComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminStatusBadgeComponent,
  ],
  providers: [OperationsFacade],
  templateUrl: './operations-failed-jobs-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationsFailedJobsPageComponent implements OnInit, OnDestroy {
  protected readonly facade = inject(OperationsFacade);
  private refreshHandle: ReturnType<typeof setInterval> | null = null;

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs(
    { label: 'Operations', route: '/admin/operations' },
    { label: 'Failed Jobs' },
  );
  protected readonly jobs = this.facade.jobs;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;
  protected readonly rows = computed(() => this.jobs()?.items ?? []);
  protected readonly selectedJob = signal<OperationalJobDto | null>(null);
  protected detailsVisible = false;
  protected readonly statusFilter = signal<'Failed' | 'DeadLetter'>('Failed');

  ngOnInit(): void {
    void this.reload();
    this.refreshHandle = setInterval(() => void this.reload(), 15_000);
  }

  ngOnDestroy(): void {
    if (this.refreshHandle) {
      clearInterval(this.refreshHandle);
    }
  }

  protected async setStatusFilter(status: 'Failed' | 'DeadLetter'): Promise<void> {
    this.statusFilter.set(status);
    await this.reload();
  }

  protected async reload(): Promise<void> {
    await this.facade.loadJobs({ status: this.statusFilter(), page: 1, pageSize: 100 });
  }

  protected openDetails(job: OperationalJobDto): void {
    this.selectedJob.set(job);
    this.detailsVisible = true;
  }

  protected downloadLogs(job: OperationalJobDto): void {
    const body = [
      `Job ID: ${job.id}`,
      `Type: ${job.jobType}`,
      `Status: ${job.status}`,
      `Attempts: ${job.attempts}/${job.maxAttempts}`,
      `Correlation: ${job.correlationId ?? ''}`,
      `Worker: ${job.workerId ?? ''}`,
      `Created: ${job.createdOnUtc}`,
      `Last Retry: ${job.lastRetryOnUtc ?? ''}`,
      '',
      'Exception / Last Error:',
      job.lastError ?? '(none)',
    ].join('\n');

    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `job-${job.id.slice(0, 8)}-log.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  protected async retry(id: string): Promise<void> {
    if (await this.facade.retryJob(id)) {
      await this.reload();
    }
  }

  protected async retryAll(): Promise<void> {
    if ((await this.facade.retryAllFailed()) !== null) {
      await this.reload();
    }
  }

  protected async cancel(id: string): Promise<void> {
    if (await this.facade.cancelJob(id)) {
      await this.reload();
    }
  }
}

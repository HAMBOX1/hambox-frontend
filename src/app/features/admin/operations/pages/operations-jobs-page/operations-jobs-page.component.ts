import { DatePipe, DecimalPipe, SlicePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { OperationalJobDto } from '../../models/operations-api.model';
import { OperationsFacade } from '../../services/operations.facade';
import {
  exportRowsToCsv,
  exportRowsToExcel,
  exportRowsToJson,
} from '../../utils/operations-export.util';

@Component({
  selector: 'app-operations-jobs-page',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    SlicePipe,
    FormsModule,
    TranslatePipe,
    ButtonModule,
    DrawerModule,
    InputTextModule,
    SelectModule,
    TableModule,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminSectionCardComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminStatusBadgeComponent,
  ],
  providers: [OperationsFacade],
  templateUrl: './operations-jobs-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationsJobsPageComponent implements OnInit, OnDestroy {
  protected readonly facade = inject(OperationsFacade);
  private refreshHandle: ReturnType<typeof setInterval> | null = null;

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs(
    { label: 'Operations', route: '/admin/operations' },
    { label: 'Jobs' },
  );
  protected readonly jobs = this.facade.jobs;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;
  protected readonly jobHistory = this.facade.jobHistory;
  protected readonly status = signal<string | undefined>(undefined);
  protected readonly queue = signal<string | undefined>(undefined);
  protected readonly search = signal('');
  protected readonly statusOptions = [
    { label: 'All', value: undefined },
    { label: 'Queued', value: 'Queued' },
    { label: 'Running', value: 'Running' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Failed', value: 'Failed' },
    { label: 'Retrying', value: 'Retrying' },
    { label: 'Cancelled', value: 'Cancelled' },
    { label: 'Dead Letter', value: 'DeadLetter' },
  ];
  protected readonly queueOptions = [
    { label: 'All queues', value: undefined },
    { label: 'default', value: 'default' },
    { label: 'emails', value: 'emails' },
    { label: 'notifications', value: 'notifications' },
    { label: 'suppliers', value: 'suppliers' },
    { label: 'reports', value: 'reports' },
    { label: 'maintenance', value: 'maintenance' },
    { label: 'high-priority', value: 'high-priority' },
    { label: 'future-payment', value: 'future-payment' },
  ];

  protected readonly rows = computed(() => this.jobs()?.items ?? []);
  protected readonly selectedJob = signal<OperationalJobDto | null>(null);
  protected detailsVisible = false;

  ngOnInit(): void {
    void this.reload();
    this.refreshHandle = setInterval(() => void this.reload(false), 15_000);
  }

  ngOnDestroy(): void {
    if (this.refreshHandle) {
      clearInterval(this.refreshHandle);
    }
  }

  protected async reload(showLoading = true): Promise<void> {
    if (!showLoading && this.loading()) {
      return;
    }
    await this.facade.loadJobs({
      status: this.status(),
      queue: this.queue(),
      search: this.search() || undefined,
      page: 1,
      pageSize: 50,
    });
  }

  protected statusTone(status: string): AdminStatusTone {
    switch (status) {
      case 'Failed':
      case 'DeadLetter':
        return 'danger';
      case 'Retrying':
      case 'Queued':
        return 'warning';
      case 'Running':
        return 'info';
      case 'Completed':
        return 'success';
      default:
        return 'neutral';
    }
  }

  protected async openDetails(job: OperationalJobDto): Promise<void> {
    this.selectedJob.set(job);
    this.detailsVisible = true;
    await this.facade.loadJobHistory(job.id);
  }

  protected async retrySelected(): Promise<void> {
    const job = this.selectedJob();
    if (!job) {
      return;
    }
    if (await this.facade.retryJob(job.id)) {
      this.detailsVisible = false;
      await this.reload();
    }
  }

  protected async cancelSelected(): Promise<void> {
    const job = this.selectedJob();
    if (!job) {
      return;
    }
    if (await this.facade.cancelJob(job.id)) {
      this.detailsVisible = false;
      await this.reload();
    }
  }

  protected export(format: 'csv' | 'excel' | 'json'): void {
    const items = this.rows();
    const headers = ['Id', 'JobType', 'Status', 'Priority', 'Queue', 'Attempts', 'LastError', 'CreatedOnUtc'];
    const data = items.map((j) => [
      j.id,
      j.jobType,
      j.status,
      j.priority,
      j.queue,
      j.attempts,
      j.lastError,
      j.createdOnUtc,
    ]);
    if (format === 'csv') {
      exportRowsToCsv(headers, data, 'operational-jobs.csv');
    } else if (format === 'excel') {
      exportRowsToExcel(headers, data, 'operational-jobs.xls');
    } else {
      exportRowsToJson(items, 'operational-jobs.json');
    }
  }
}

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
  protected readonly status = signal<string | undefined>(undefined);
  protected readonly search = signal('');
  protected readonly statusOptions = [
    { label: 'All', value: undefined },
    { label: 'Queued', value: 'Queued' },
    { label: 'Running', value: 'Running' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Failed', value: 'Failed' },
    { label: 'Retrying', value: 'Retrying' },
    { label: 'Cancelled', value: 'Cancelled' },
  ];

  protected readonly rows = computed(() => this.jobs()?.items ?? []);

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
      search: this.search() || undefined,
      page: 1,
      pageSize: 50,
    });
  }

  protected statusTone(status: string): AdminStatusTone {
    switch (status) {
      case 'Failed':
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

  protected export(format: 'csv' | 'excel' | 'json'): void {
    const items = this.rows();
    const headers = ['Id', 'JobType', 'Status', 'Priority', 'Attempts', 'LastError', 'CreatedOnUtc'];
    const data = items.map((j) => [
      j.id,
      j.jobType,
      j.status,
      j.priority,
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

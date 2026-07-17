import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';

import {
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { OperationsFacade } from '../../services/operations.facade';

@Component({
  selector: 'app-operations-recurring-jobs-page',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    TranslatePipe,
    TableModule,
    AdminPageHeaderComponent,
    AdminSectionCardComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
  ],
  providers: [OperationsFacade],
  templateUrl: './operations-recurring-jobs-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationsRecurringJobsPageComponent implements OnInit {
  protected readonly facade = inject(OperationsFacade);
  protected readonly breadcrumbs = adminBreadcrumbs(
    { label: 'Operations', route: '/admin/operations' },
    { label: 'Recurring Jobs' },
  );
  protected readonly recurringJobs = this.facade.recurringJobs;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;

  ngOnInit(): void {
    void this.facade.loadRecurringJobs();
  }
}

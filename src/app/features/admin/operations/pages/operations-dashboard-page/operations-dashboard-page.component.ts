import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStatCardComponent,
  AdminStatGridComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { OperationsFacade } from '../../services/operations.facade';

@Component({
  selector: 'app-operations-dashboard-page',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    TableModule,
    AdminPageHeaderComponent,
    AdminStatGridComponent,
    AdminStatCardComponent,
    AdminSectionCardComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminStatusBadgeComponent,
  ],
  providers: [OperationsFacade],
  templateUrl: './operations-dashboard-page.component.html',
  styleUrl: './operations-dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationsDashboardPageComponent implements OnInit, OnDestroy {
  private readonly facade = inject(OperationsFacade);
  private refreshHandle: ReturnType<typeof setInterval> | null = null;

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs(
    { label: 'Operations', route: '/admin/operations' },
    { label: 'Dashboard' },
  );
  protected readonly dashboard = this.facade.dashboard;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;

  ngOnInit(): void {
    void this.facade.loadDashboard();
    this.refreshHandle = setInterval(() => void this.facade.loadDashboard(), 15_000);
  }

  ngOnDestroy(): void {
    if (this.refreshHandle) {
      clearInterval(this.refreshHandle);
    }
  }

  protected statusTone(status: string): AdminStatusTone {
    switch (status) {
      case 'Critical':
      case 'Failed':
      case 'Unhealthy':
        return 'danger';
      case 'Warning':
      case 'Degraded':
        return 'warning';
      case 'Info':
        return 'info';
      default:
        return 'success';
    }
  }
}

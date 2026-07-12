import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';

import {
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { OperationsFacade } from '../../services/operations.facade';

@Component({
  selector: 'app-operations-health-page',
  standalone: true,
  imports: [
    DatePipe,
    TranslatePipe,
    ButtonModule,
    TableModule,
    AdminPageHeaderComponent,
    AdminSectionCardComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminStatusBadgeComponent,
  ],
  providers: [OperationsFacade],
  templateUrl: './operations-health-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationsHealthPageComponent implements OnInit {
  protected readonly facade = inject(OperationsFacade);
  protected readonly breadcrumbs = adminBreadcrumbs(
    { label: 'Operations', route: '/admin/operations' },
    { label: 'Health' },
  );
  protected readonly health = this.facade.health;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;

  ngOnInit(): void {
    void this.facade.loadHealth();
  }

  protected tone(status: string): AdminStatusTone {
    if (status === 'Healthy') return 'success';
    if (status === 'Degraded') return 'warning';
    return 'danger';
  }
}

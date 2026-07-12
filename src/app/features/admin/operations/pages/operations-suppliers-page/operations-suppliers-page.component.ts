import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
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
  selector: 'app-operations-suppliers-page',
  standalone: true,
  imports: [
    DatePipe,
    TranslatePipe,
    TableModule,
    AdminPageHeaderComponent,
    AdminSectionCardComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminStatusBadgeComponent,
  ],
  providers: [OperationsFacade],
  templateUrl: './operations-suppliers-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationsSuppliersPageComponent implements OnInit {
  private readonly facade = inject(OperationsFacade);
  protected readonly breadcrumbs = adminBreadcrumbs(
    { label: 'Operations', route: '/admin/operations' },
    { label: 'Suppliers' },
  );
  protected readonly suppliers = this.facade.suppliers;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;

  ngOnInit(): void {
    void this.facade.loadSuppliers();
  }

  protected tone(status: string): AdminStatusTone {
    return status === 'Active' ? 'success' : 'warning';
  }
}

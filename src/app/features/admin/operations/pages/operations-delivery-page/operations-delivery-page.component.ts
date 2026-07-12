import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
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

@Component({
  selector: 'app-operations-delivery-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    TranslatePipe,
    ButtonModule,
    InputTextModule,
    TableModule,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminSectionCardComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminStatusBadgeComponent,
  ],
  providers: [OperationsFacade],
  templateUrl: './operations-delivery-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationsDeliveryPageComponent implements OnInit {
  protected readonly facade = inject(OperationsFacade);
  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs(
    { label: 'Operations', route: '/admin/operations' },
    { label: 'Delivery' },
  );
  protected readonly delivery = this.facade.delivery;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;
  protected readonly search = signal('');
  protected readonly rows = computed(() => this.delivery()?.items ?? []);

  ngOnInit(): void {
    void this.reload();
  }

  protected async reload(): Promise<void> {
    await this.facade.loadDelivery({
      search: this.search() || undefined,
      page: 1,
      pageSize: 50,
    });
  }

  protected async retry(orderId: string): Promise<void> {
    if (await this.facade.retryDelivery(orderId)) {
      await this.reload();
    }
  }

  protected tone(status: string): AdminStatusTone {
    if (status === 'Delivered') return 'success';
    if (status.includes('Partial') || status.includes('Awaiting')) return 'warning';
    return 'neutral';
  }
}

import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminIconButtonComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminStatusBadgeComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { PaymentGatewaysManagementFacade } from '../../services/payment-gateways-management.facade';

@Component({
  selector: 'app-payment-gateways-list-page',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminEmptyStateComponent,
    AdminLoadingSkeletonComponent,
    AdminIconButtonComponent,
    AdminStatusBadgeComponent,
  ],
  providers: [PaymentGatewaysManagementFacade],
  templateUrl: './payment-gateways-list-page.component.html',
  styleUrl: './payment-gateways-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentGatewaysListPageComponent implements OnInit {
  protected readonly facade = inject(PaymentGatewaysManagementFacade);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Payment Gateways' });

  protected readonly gateways = this.facade.list;
  protected readonly loading = this.facade.listLoading;
  protected readonly error = this.facade.listError;

  ngOnInit(): void {
    void this.facade.loadGateways();
  }

  protected retryLoad(): void {
    void this.facade.loadGateways();
  }
}

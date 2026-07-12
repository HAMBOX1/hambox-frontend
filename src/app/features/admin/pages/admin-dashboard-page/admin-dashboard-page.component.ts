import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';

import { CurrencyService } from '../../../../core/currency/currency.service';
import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import {
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStatCardComponent,
  AdminStatGridComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
} from '../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { AdminDashboardFacade } from '../../services/admin-dashboard.facade';
import { AdminDashboardAlertsDto } from '../../models/admin-dashboard.model';

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    TranslatePipe,
    ButtonModule,
    TableModule,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminStatGridComponent,
    AdminStatCardComponent,
    AdminSectionCardComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminStatusBadgeComponent,
    HamboxCurrencyPipe,
  ],
  providers: [AdminDashboardFacade],
  templateUrl: './admin-dashboard-page.component.html',
  styleUrl: './admin-dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPageComponent implements OnInit {
  private readonly facade = inject(AdminDashboardFacade);
  private readonly currencyService = inject(CurrencyService);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Dashboard' });
  protected readonly dashboard = this.facade.dashboard;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;

  protected readonly recentOrdersTable = computed(() => {
    const data = this.dashboard();
    return data ? [...data.recentOrders] : [];
  });

  protected readonly recentCustomersTable = computed(() => {
    const data = this.dashboard();
    return data ? [...data.recentCustomers] : [];
  });

  protected readonly lowStockTable = computed(() => {
    const data = this.dashboard();
    return data ? [...data.lowStockItems] : [];
  });

  ngOnInit(): void {
    void this.facade.load();
  }

  protected formatMoney(amount: number | null | undefined): string {
    return this.currencyService.format(amount ?? 0);
  }

  protected hasAlerts(alerts: AdminDashboardAlertsDto): boolean {
    return (
      alerts.failedOrders > 0 ||
      alerts.failedPayments > 0 ||
      alerts.lowStockVariants > 0 ||
      alerts.outOfStockVariants > 0
    );
  }

  protected statusTone(status: string): AdminStatusTone {
    switch (status) {
      case 'Completed':
      case 'Delivered':
      case 'Paid':
        return 'success';
      case 'Processing':
      case 'Partially Delivered':
        return 'info';
      case 'Pending':
      case 'Awaiting Delivery':
        return 'warning';
      case 'Cancelled':
      case 'Failed':
        return 'danger';
      case 'Refunded':
        return 'neutral';
      default:
        return 'neutral';
    }
  }
}
